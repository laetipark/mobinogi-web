package com.example.mobinogi.controller.file;

import com.example.mobinogi.service.file.FileStorageService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Slf4j
public class FileUploadController{

	private final FileStorageService fileStorageService;
	private final JwtUtil jwtUtil;

	private static final Set<String> ALLOWED_TYPES = Set.of("profile", "board");

	@PostMapping("/image")
	public ResponseEntity<Map<String, Object>> uploadImage(
		@RequestHeader("Authorization") String authHeader,
		@RequestParam("file") MultipartFile file,
		@RequestParam(value = "type", defaultValue = "board") String type
	){
		Map<String, Object> response = new HashMap<>();
		try{
			Long userId = getUserIdFromToken(authHeader);

			if(!ALLOWED_TYPES.contains(type)){
				response.put("success", false);
				response.put("message", "허용되지 않는 업로드 타입입니다.");
				return ResponseEntity.badRequest().body(response);
			}

			String url = fileStorageService.storeFile(file, type);
			log.info("이미지 업로드 성공 - userId: {}, type: {}, url: {}", userId, type, url);

			response.put("success", true);
			response.put("url", url);
			return ResponseEntity.ok(response);
		}catch(IllegalArgumentException e){
			response.put("success", false);
			response.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(response);
		}catch(Exception e){
			log.error("이미지 업로드 실패", e);
			response.put("success", false);
			response.put("message", "이미지 업로드에 실패했습니다.");
			return ResponseEntity.internalServerError().body(response);
		}
	}

	@DeleteMapping("/image")
	public ResponseEntity<Map<String, Object>> deleteImage(
		@RequestHeader("Authorization") String authHeader,
		@RequestParam("url") String fileUrl
	){
		Map<String, Object> response = new HashMap<>();
		try{
			getUserIdFromToken(authHeader);

			boolean deleted = fileStorageService.deleteFile(fileUrl);
			response.put("success", deleted);
			response.put("message", deleted ? "삭제되었습니다." : "파일을 찾을 수 없습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			log.error("이미지 삭제 실패", e);
			response.put("success", false);
			response.put("message", "이미지 삭제에 실패했습니다.");
			return ResponseEntity.internalServerError().body(response);
		}
	}

	private Long getUserIdFromToken(String authHeader){
		if(authHeader == null || !authHeader.startsWith("Bearer ")){
			throw new RuntimeException("인증 토큰이 필요합니다.");
		}
		String token = authHeader.substring(7);
		if(!jwtUtil.validateToken(token)){
			throw new RuntimeException("유효하지 않은 토큰입니다.");
		}
		return jwtUtil.getUserIdFromToken(token);
	}
}
