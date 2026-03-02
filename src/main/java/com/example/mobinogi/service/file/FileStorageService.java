package com.example.mobinogi.service.file;

import com.jcraft.jsch.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService{

	/** SFTP 호스트 */
	@Value("${sftp.host}")
	/**
	 * Field sftpHost.
	 */
	private String sftpHost;

	/** SFTP 포트(빈 값이면 기본 포트 사용) */
	@Value("${sftp.port:}")
	/**
	 * Field sftpPort.
	 */
	private String sftpPort;

	/** SFTP 사용자명 */
	@Value("${sftp.username}")
	/**
	 * Field sftpUsername.
	 */
	private String sftpUsername;

	/** SFTP 비밀번호 */
	@Value("${sftp.password}")
	/**
	 * Field sftpPassword.
	 */
	private String sftpPassword;

	/** 원격 저장 루트 경로 */
	@Value("${sftp.remote-path}")
	/**
	 * Field remotePath.
	 */
	private String remotePath;

	/** 허용 확장자 */
	private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp");

	/** 허용 MIME 타입 */
	private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
		"image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg", "image/pjpeg", "image/x-png"
	);

	/** 최대 업로드 크기(30MB) */
	private static final long MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

	/** 임시 경로 접두어 */
	private static final String TEMP_SUBDIR_PREFIX = "_tmp-";

	/** 기본 SFTP 포트 */
	private static final int DEFAULT_SFTP_PORT = 22;

	/**
	 * 파일을 최종 경로에 저장합니다.
	 *
	 * @param file 업로드 파일
	 * @param subDir 저장 하위 디렉터리
	 * @return API 접근 URL
	 */
	public String storeFile(MultipartFile file, String subDir) throws Exception{
		validateFile(file);
		return storeFileInternal(file, subDir, null);
	}

	/**
	 * 파일을 임시 경로에 저장합니다.
	 *
	 * @param file 업로드 파일
	 * @param type 임시 타입 구분자
	 * @param userId 업로드 사용자 ID
	 * @return 임시 파일 API URL
	 */
	public String storeTempFile(MultipartFile file, String type, Long userId) throws Exception{
		if(userId == null){
			throw new IllegalArgumentException("User id is required for temp upload.");
		}
		validateFile(file);
		String tempSubDir = TEMP_SUBDIR_PREFIX + type;
		String filenamePrefix = "u" + userId + "_";
		return storeFileInternal(file, tempSubDir, filenamePrefix);
	}

	/**
	 * 임시 파일을 최종 경로로 승격합니다.
	 *
	 * @param tempUrl 임시 파일 URL
	 * @param targetSubDir 대상 하위 경로
	 * @param userId 사용자 ID
	 * @return 최종 파일 API URL
	 */
	public String promoteTempFile(String tempUrl, String targetSubDir, Long userId) throws Exception{
		StoredFilePath parsed = parseStoredFileUrl(tempUrl);
		if(!parsed.subDir().startsWith(TEMP_SUBDIR_PREFIX)){
			throw new IllegalArgumentException("Only temp files can be promoted.");
		}
		String expectedPrefix = "u" + userId + "_";
		if(!parsed.filename().startsWith(expectedPrefix)){
			throw new IllegalArgumentException("Temp file owner mismatch.");
		}

		String finalFilename = parsed.filename().substring(expectedPrefix.length());
		if(finalFilename.isBlank()){
			throw new IllegalArgumentException("Invalid temp file name.");
		}

		String sourceRemotePath = remotePath + "/" + parsed.subDir() + "/" + parsed.filename();
		String targetRemoteDir = remotePath + "/" + targetSubDir;
		String targetRemotePath = targetRemoteDir + "/" + finalFilename;
		String targetApiUrl = "/api/files/" + targetSubDir + "/" + finalFilename;

		Session session = null;
		ChannelSftp channel = null;
		try{
			session = createSession();
			channel = (ChannelSftp) session.openChannel("sftp");
			channel.connect(5000);

			mkdirs(channel, targetRemoteDir);
			if(!exists(channel, sourceRemotePath)){
				if(exists(channel, targetRemotePath)){
					log.warn(
						"SFTP temp source already promoted (source missing, target exists): {} -> {}",
						sourceRemotePath,
						targetRemotePath
					);
					return targetApiUrl;
				}
				throw new IllegalArgumentException("Temp file not found.");
			}
			try{
				channel.rename(sourceRemotePath, targetRemotePath);
			}catch(SftpException renameError){
				// 서버 환경에 따라 rename이 실패할 수 있어 copy+delete로 fallback 합니다.
				if(isNoSuchFile(renameError) && exists(channel, targetRemotePath)){
					log.warn(
						"SFTP rename source missing but target exists, returning promoted path: {}",
						targetRemotePath
					);
					return targetApiUrl;
				}
				ByteArrayOutputStream out = new ByteArrayOutputStream();
				channel.get(sourceRemotePath, out);
				channel.put(new ByteArrayInputStream(out.toByteArray()), targetRemotePath);
				channel.rm(sourceRemotePath);
				log.warn("SFTP rename failed, fallback copy+delete used: {}", renameError.getMessage());
			}
			log.info("SFTP temp file promoted: {} -> {}", sourceRemotePath, targetRemotePath);

			return targetApiUrl;
		}finally{
			if(channel != null && channel.isConnected())
				channel.disconnect();
			if(session != null && session.isConnected())
				session.disconnect();
		}
	}

	/**
	 * 파일 저장 공통 구현입니다.
	 *
	 * @param file 업로드 파일
	 * @param subDir 하위 경로
	 * @param filenamePrefix 파일명 접두어
	 * @return 저장된 API URL
	 */
	private String storeFileInternal(MultipartFile file, String subDir, String filenamePrefix) throws Exception{
		String extension = getExtension(file.getOriginalFilename());
		String prefix = filenamePrefix == null ? "" : filenamePrefix;
		String storedFilename = prefix + UUID.randomUUID() + "." + extension;
		String remoteDir = remotePath + "/" + subDir;
		String remoteFilePath = remoteDir + "/" + storedFilename;

		Session session = null;
		ChannelSftp channel = null;
		try{
			session = createSession();
			channel = (ChannelSftp) session.openChannel("sftp");
			channel.connect(5000);

			mkdirs(channel, remoteDir);
			channel.put(file.getInputStream(), remoteFilePath);
			log.info("SFTP upload complete: {}:{}", sftpHost, remoteFilePath);

			return "/api/files/" + subDir + "/" + storedFilename;
		}finally{
			if(channel != null && channel.isConnected())
				channel.disconnect();
			if(session != null && session.isConnected())
				session.disconnect();
		}
	}

	/**
	 * 저장된 파일을 읽습니다.
	 *
	 * @param subDir 하위 경로
	 * @param filename 파일명
	 * @return 파일 바이트 배열
	 */
	public byte[] readFile(String subDir, String filename) throws Exception{
		String remoteFilePath = remotePath + "/" + subDir + "/" + filename;

		Session session = null;
		ChannelSftp channel = null;
		try{
			session = createSession();
			channel = (ChannelSftp) session.openChannel("sftp");
			channel.connect(5000);

			ByteArrayOutputStream out = new ByteArrayOutputStream();
			channel.get(remoteFilePath, out);
			return out.toByteArray();
		}finally{
			if(channel != null && channel.isConnected())
				channel.disconnect();
			if(session != null && session.isConnected())
				session.disconnect();
		}
	}

	/**
	 * 파일 URL 기준으로 파일을 삭제합니다.
	 *
	 * @param fileUrl API 파일 URL
	 * @return 삭제 성공 여부
	 */
	public boolean deleteFile(String fileUrl){
		if(fileUrl == null || !fileUrl.startsWith("/api/files/")){
			return false;
		}

		String relativePath = fileUrl.substring("/api/files/".length());
		String remoteFilePath = remotePath + "/" + relativePath;

		Session session = null;
		ChannelSftp channel = null;
		try{
			session = createSession();
			channel = (ChannelSftp) session.openChannel("sftp");
			channel.connect(5000);

			channel.rm(remoteFilePath);
			log.info("SFTP delete complete: {}:{}", sftpHost, remoteFilePath);
			return true;
		}catch(Exception e){
			log.error("SFTP delete failed: {}", remoteFilePath, e);
			return false;
		}finally{
			if(channel != null && channel.isConnected())
				channel.disconnect();
			if(session != null && session.isConnected())
				session.disconnect();
		}
	}

	/**
	 * SFTP 세션을 생성합니다.
	 */
	private Session createSession() throws JSchException{
		JSch jsch = new JSch();
		Session session = jsch.getSession(sftpUsername, sftpHost, resolveSftpPort());
		session.setPassword(sftpPassword);
		session.setConfig("StrictHostKeyChecking", "no");
		session.connect(5000);
		return session;
	}

	/**
	 * 설정값 기반 SFTP 포트를 계산합니다.
	 */
	private int resolveSftpPort(){
		if(sftpPort == null || sftpPort.isBlank()){
			return DEFAULT_SFTP_PORT;
		}
		try{
			return Integer.parseInt(sftpPort.trim());
		}catch(NumberFormatException e){
			throw new IllegalStateException("Invalid sftp.port: " + sftpPort, e);
		}
	}

	/**
	 * 원격 디렉터리를 재귀적으로 생성합니다.
	 */
	private void mkdirs(ChannelSftp channel, String path){
		String[] dirs = path.split("/");
		StringBuilder current = new StringBuilder();
		for(String dir : dirs){
			if(dir.isEmpty())
				continue;
			current.append("/").append(dir);
			try{
				channel.cd(current.toString());
			}catch(SftpException e){
				try{
					channel.mkdir(current.toString());
				}catch(SftpException ignored){
				}
			}
		}
	}

	/**
	 * 원격 파일/경로 존재 여부를 조회합니다.
	 */
	private boolean exists(ChannelSftp channel, String path){
		try{
			channel.lstat(path);
			return true;
		}catch(SftpException e){
			return false;
		}
	}

	/**
	 * SFTP 예외가 파일 미존재인지 판별합니다.
	 */
	private boolean isNoSuchFile(SftpException e){
		return e != null && e.id == ChannelSftp.SSH_FX_NO_SUCH_FILE;
	}

	/**
	 * 업로드 파일 유효성(용량/확장자/MIME)을 검증합니다.
	 */
	private void validateFile(MultipartFile file){
		if(file == null || file.isEmpty()){
			throw new IllegalArgumentException("File is empty.");
		}
		if(file.getSize() > MAX_FILE_SIZE){
			throw new IllegalArgumentException("File size exceeds 30MB.");
		}

		String extension = getExtension(file.getOriginalFilename());
		if(!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())){
			throw new IllegalArgumentException("Unsupported file extension. Allowed: jpg, jpeg, png, gif, webp.");
		}

		String contentType = normalizeContentType(file.getContentType());
		if(contentType != null && !ALLOWED_CONTENT_TYPES.contains(contentType)){
			throw new IllegalArgumentException("Unsupported content type: " + contentType);
		}
	}

	/**
	 * Content-Type 문자열을 정규화합니다.
	 */
	private String normalizeContentType(String contentType){
		if(contentType == null){
			return null;
		}
		String normalized = contentType.trim().toLowerCase();
		int semicolon = normalized.indexOf(';');
		if(semicolon >= 0){
			normalized = normalized.substring(0, semicolon).trim();
		}
		return normalized.isEmpty() ? null : normalized;
	}

	/**
	 * 파일명에서 확장자를 추출합니다.
	 */
	private String getExtension(String filename){
		if(filename == null || !filename.contains(".")){
			throw new IllegalArgumentException("Cannot detect file extension.");
		}
		return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
	}

	/**
	 * 저장 URL을 내부 경로 정보로 파싱합니다.
	 */
	/**
	 * Parses stored file URL into path components.
	 *
	 * @param fileUrl stored URL
	 * @return parsed path payload
	 */
	private StoredFilePath parseStoredFileUrl(String fileUrl){
		if(fileUrl == null || !fileUrl.startsWith("/api/files/")){
			throw new IllegalArgumentException("Invalid stored file URL.");
		}
		String relativePath = fileUrl.substring("/api/files/".length());
		String[] parts = relativePath.split("/", 2);
		if(parts.length != 2){
			throw new IllegalArgumentException("Invalid stored file URL.");
		}
		String subDir = parts[0];
		String filename = parts[1];
		if(subDir.isBlank() || filename.isBlank() || filename.contains("/")){
			throw new IllegalArgumentException("Invalid stored file URL.");
		}
		return new StoredFilePath(subDir, filename);
	}

	/**
	 * Parsed storage path payload.
	 *
	 * @param subDir storage sub-directory
	 * @param filename stored filename
	 */
	private record StoredFilePath(String subDir, String filename){
	}
}
