package com.example.mobinogi.controller.file;

import com.example.mobinogi.service.file.FileStorageService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * File upload/delete API controller.
 */
@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Slf4j
public class FileUploadController{

	/** File storage service. */
	private final FileStorageService fileStorageService;

	/** JWT utility for upload authorization. */
	private final JwtUtil jwtUtil;

	/** Supported upload type values. */
	private static final Set<String> ALLOWED_TYPES = Set.of("profile", "board");

	/**
	 * Uploads an image file to final or temporary path.
	 *
	 * @param authHeader authorization header
	 * @param file multipart image file
	 * @param type upload type
	 * @param temporary temporary-upload flag
	 * @return upload result response
	 */
	@PostMapping("/image")
	public ResponseEntity<Map<String, Object>> uploadImage(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestParam(value = "file", required = false) MultipartFile file,
		@RequestParam(value = "type", defaultValue = "board") String type,
		@RequestParam(value = "temporary", defaultValue = "false") boolean temporary
	){
		Map<String, Object> response = new HashMap<>();
		String normalizedType = normalizeType(type);

		try{
			Long userId = getUserIdFromToken(authHeader);

			if(file == null || file.isEmpty()){
				response.put("success", false);
				response.put("message", "File is missing or empty.");
				return ResponseEntity.badRequest().body(response);
			}

			if(!ALLOWED_TYPES.contains(normalizedType)){
				response.put("success", false);
				response.put("message", "Unsupported upload type: " + normalizedType);
				return ResponseEntity.badRequest().body(response);
			}

			log.info(
				"Image upload request - userId: {}, type: {}, filename: {}, contentType: {}, size: {}",
				userId,
				normalizedType,
				file.getOriginalFilename(),
				file.getContentType(),
				file.getSize()
			);

			String url = temporary
				? fileStorageService.storeTempFile(file, normalizedType, userId)
				: fileStorageService.storeFile(file, normalizedType);

			log.info(
				"Image upload success - userId: {}, type: {}, temporary: {}, url: {}",
				userId,
				normalizedType,
				temporary,
				url
			);

			response.put("success", true);
			response.put("url", url);
			response.put("temporary", temporary);
			return ResponseEntity.ok(response);
		}catch(SecurityException e){
			response.put("success", false);
			response.put("message", e.getMessage());
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
		}catch(IllegalArgumentException e){
			response.put("success", false);
			response.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(response);
		}catch(Exception e){
			log.error("Image upload failed", e);
			response.put("success", false);
			response.put("message", "Image upload failed.");
			return ResponseEntity.internalServerError().body(response);
		}
	}

	/**
	 * Deletes uploaded image by URL.
	 *
	 * @param authHeader authorization header
	 * @param fileUrl file URL to delete
	 * @return delete result response
	 */
	@DeleteMapping("/image")
	public ResponseEntity<Map<String, Object>> deleteImage(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestParam("url") String fileUrl
	){
		Map<String, Object> response = new HashMap<>();
		try{
			getUserIdFromToken(authHeader);

			boolean deleted = fileStorageService.deleteFile(fileUrl);
			response.put("success", deleted);
			response.put("message", deleted ? "Deleted." : "File not found.");
			return ResponseEntity.ok(response);
		}catch(SecurityException e){
			response.put("success", false);
			response.put("message", e.getMessage());
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
		}catch(Exception e){
			log.error("Image delete failed", e);
			response.put("success", false);
			response.put("message", "Image delete failed.");
			return ResponseEntity.internalServerError().body(response);
		}
	}

	/**
	 * Extracts user ID from bearer token.
	 *
	 * @param authHeader authorization header
	 * @return user ID
	 */
	private Long getUserIdFromToken(String authHeader){
		if(authHeader == null || !authHeader.startsWith("Bearer ")){
			throw new SecurityException("Authorization token is required.");
		}

		String token = authHeader.substring(7);
		if(!jwtUtil.validateToken(token)){
			throw new SecurityException("Invalid token.");
		}

		return jwtUtil.getUserIdFromToken(token);
	}

	/**
	 * Normalizes upload type text.
	 *
	 * @param type raw type string
	 * @return normalized type
	 */
	private String normalizeType(String type){
		if(type == null){
			return "board";
		}
		String trimmed = type.trim().toLowerCase();
		return trimmed.isEmpty() ? "board" : trimmed;
	}
}
