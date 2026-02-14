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

	@Value("${sftp.host}")
	private String sftpHost;

	@Value("${sftp.port:22}")
	private int sftpPort;

	@Value("${sftp.username}")
	private String sftpUsername;

	@Value("${sftp.password}")
	private String sftpPassword;

	@Value("${sftp.remote-path}")
	private String remotePath;

	private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "gif", "webp");
	private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
		"image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg", "image/pjpeg", "image/x-png"
	);
	private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
	private static final String TEMP_SUBDIR_PREFIX = "_tmp-";

	public String storeFile(MultipartFile file, String subDir) throws Exception{
		validateFile(file);
		return storeFileInternal(file, subDir, null);
	}

	public String storeTempFile(MultipartFile file, String type, Long userId) throws Exception{
		if(userId == null){
			throw new IllegalArgumentException("User id is required for temp upload.");
		}
		validateFile(file);
		String tempSubDir = TEMP_SUBDIR_PREFIX + type;
		String filenamePrefix = "u" + userId + "_";
		return storeFileInternal(file, tempSubDir, filenamePrefix);
	}

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

		Session session = null;
		ChannelSftp channel = null;
		try{
			session = createSession();
			channel = (ChannelSftp) session.openChannel("sftp");
			channel.connect(5000);

			mkdirs(channel, targetRemoteDir);
			try{
				channel.rename(sourceRemotePath, targetRemotePath);
			}catch(SftpException renameError){
				ByteArrayOutputStream out = new ByteArrayOutputStream();
				channel.get(sourceRemotePath, out);
				channel.put(new ByteArrayInputStream(out.toByteArray()), targetRemotePath);
				channel.rm(sourceRemotePath);
				log.warn("SFTP rename failed, fallback copy+delete used: {}", renameError.getMessage());
			}
			log.info("SFTP temp file promoted: {} -> {}", sourceRemotePath, targetRemotePath);

			return "/api/files/" + targetSubDir + "/" + finalFilename;
		}finally{
			if(channel != null && channel.isConnected())
				channel.disconnect();
			if(session != null && session.isConnected())
				session.disconnect();
		}
	}

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

	private Session createSession() throws JSchException{
		JSch jsch = new JSch();
		Session session = jsch.getSession(sftpUsername, sftpHost, sftpPort);
		session.setPassword(sftpPassword);
		session.setConfig("StrictHostKeyChecking", "no");
		session.connect(5000);
		return session;
	}

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

	private void validateFile(MultipartFile file){
		if(file == null || file.isEmpty()){
			throw new IllegalArgumentException("File is empty.");
		}
		if(file.getSize() > MAX_FILE_SIZE){
			throw new IllegalArgumentException("File size exceeds 5MB.");
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

	private String getExtension(String filename){
		if(filename == null || !filename.contains(".")){
			throw new IllegalArgumentException("Cannot detect file extension.");
		}
		return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
	}

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

	private record StoredFilePath(String subDir, String filename){
	}
}
