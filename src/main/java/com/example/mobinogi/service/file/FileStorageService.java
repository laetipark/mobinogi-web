package com.example.mobinogi.service.file;

import com.jcraft.jsch.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
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
		"image/jpeg", "image/png", "image/gif", "image/webp"
	);
	private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
	
	public String storeFile(MultipartFile file, String subDir) throws Exception{
		validateFile(file);
		
		String extension = getExtension(file.getOriginalFilename());
		String storedFilename = UUID.randomUUID() + "." + extension;
		String remoteDir = remotePath + "/" + subDir;
		String remoteFilePath = remoteDir + "/" + storedFilename;
		
		Session session = null;
		ChannelSftp channel = null;
		try{
			session = createSession();
			channel = (ChannelSftp) session.openChannel("sftp");
			channel.connect(5000);
			
			// 디렉토리 생성 (없으면)
			mkdirs(channel, remoteDir);
			
			// 파일 업로드
			channel.put(file.getInputStream(), remoteFilePath);
			log.info("SFTP 업로드 완료: {}:{}", sftpHost, remoteFilePath);
			
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
			log.info("SFTP 삭제 완료: {}:{}", sftpHost, remoteFilePath);
			return true;
		}catch(Exception e){
			log.error("SFTP 삭제 실패: {}", remoteFilePath, e);
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
			throw new IllegalArgumentException("파일이 비어있습니다.");
		}
		if(file.getSize() > MAX_FILE_SIZE){
			throw new IllegalArgumentException("파일 크기가 5MB를 초과합니다.");
		}
		String contentType = file.getContentType();
		if(contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)){
			throw new IllegalArgumentException("허용되지 않는 파일 형식입니다. (jpg, png, gif, webp만 가능)");
		}
		String extension = getExtension(file.getOriginalFilename());
		if(!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())){
			throw new IllegalArgumentException("허용되지 않는 확장자입니다. (jpg, png, gif, webp만 가능)");
		}
	}
	
	private String getExtension(String filename){
		if(filename == null || !filename.contains(".")){
			throw new IllegalArgumentException("파일 확장자를 확인할 수 없습니다.");
		}
		return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
	}
}
