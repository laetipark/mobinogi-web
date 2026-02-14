package com.example.mobinogi.controller.photo;

import com.example.mobinogi.dto.photo.PhotoBoardPostDto;
import com.example.mobinogi.dto.photo.PhotoBoardPostCreateRequest;
import com.example.mobinogi.service.photo.PhotoBoardService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/photo-board")
@RequiredArgsConstructor
public class PhotoBoardController{

	private final PhotoBoardService photoBoardService;
	private final JwtUtil jwtUtil;

	private Long getOptionalUserIdFromToken(String authHeader){
		if(authHeader == null || !authHeader.startsWith("Bearer ")){
			return null;
		}
		String token = authHeader.substring(7);
		if(!jwtUtil.validateToken(token)){
			return null;
		}
		return jwtUtil.getUserIdFromToken(token);
	}

	private Long getUserIdFromToken(String authHeader){
		if(authHeader == null || !authHeader.startsWith("Bearer ")){
			throw new RuntimeException("Authentication token is required.");
		}
		String token = authHeader.substring(7);
		if(!jwtUtil.validateToken(token)){
			throw new RuntimeException("Invalid token.");
		}
		return jwtUtil.getUserIdFromToken(token);
	}

	@GetMapping("/posts")
	public ResponseEntity<?> getPosts(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestParam(required = false) String keyword,
		@RequestParam(required = false) String tag,
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "20") int size
	){
		try{
			Long currentUserId = getOptionalUserIdFromToken(authHeader);
			Page<PhotoBoardPostDto> posts = photoBoardService.getPosts(currentUserId, keyword, tag, page, size);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("data", posts);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(errorResponse);
		}
	}

	@GetMapping("/posts/{photoPostId}")
	public ResponseEntity<?> getPost(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long photoPostId
	){
		try{
			Long currentUserId = getOptionalUserIdFromToken(authHeader);
			PhotoBoardPostDto post = photoBoardService.getPost(currentUserId, photoPostId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("post", post);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			return ResponseEntity.status(404).body(errorResponse);
		}
	}

	@PostMapping("/posts")
	public ResponseEntity<?> createPost(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody PhotoBoardPostCreateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			PhotoBoardPostDto post = photoBoardService.createPost(userId, request);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("post", post);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			int status = e.getMessage() != null && e.getMessage().toLowerCase().contains("token") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	@PutMapping("/posts/{photoPostId}")
	public ResponseEntity<?> updatePost(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long photoPostId,
		@RequestBody PhotoBoardPostCreateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			PhotoBoardPostDto post = photoBoardService.updatePost(userId, photoPostId, request);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("post", post);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			int status = resolveErrorStatus(e.getMessage());
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	@DeleteMapping("/posts/{photoPostId}")
	public ResponseEntity<?> deletePost(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long photoPostId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			photoBoardService.deletePost(userId, photoPostId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			int status = resolveErrorStatus(e.getMessage());
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	@PostMapping("/posts/{photoPostId}/like")
	public ResponseEntity<?> toggleLike(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long photoPostId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			PhotoBoardPostDto post = photoBoardService.toggleLike(userId, photoPostId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("post", post);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			int status = resolveErrorStatus(e.getMessage());
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	private int resolveErrorStatus(String message){
		if(message == null){
			return 400;
		}
		String lower = message.toLowerCase();
		if(lower.contains("token")){
			return 401;
		}
		if(lower.contains("only the author")){
			return 403;
		}
		if(lower.contains("not found")){
			return 404;
		}
		return 400;
	}
}
