package com.example.mobinogi.controller.photo;

import com.example.mobinogi.dto.photo.PhotoBoardPostCreateRequest;
import com.example.mobinogi.dto.photo.PhotoBoardPostDto;
import com.example.mobinogi.service.photo.PhotoBoardService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 공개 갤러리(포토 게시판) API 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/photo-board")
@RequiredArgsConstructor
public class PhotoBoardController{

	/** 포토 게시판 비즈니스 로직 서비스 */
	private final PhotoBoardService photoBoardService;

	/** 인증 토큰 처리 유틸 */
	private final JwtUtil jwtUtil;

	/**
	 * Authorization 헤더에서 사용자 ID를 선택적으로 추출합니다.
	 *
	 * @param authHeader Authorization 헤더
	 * @return 토큰이 유효하면 사용자 ID, 아니면 `null`
	 */
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

	/**
	 * Authorization 헤더에서 사용자 ID를 필수로 추출합니다.
	 *
	 * @param authHeader Authorization 헤더
	 * @return 토큰에서 추출된 사용자 ID
	 */
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

	/**
	 * 게시글 목록을 조회합니다.
	 *
	 * @param authHeader Authorization 헤더
	 * @param keyword 키워드 필터
	 * @param tag 태그 필터
	 * @param page 페이지 번호(0-based)
	 * @param size 페이지 크기
	 * @return 게시글 목록 응답
	 */
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

	/**
	 * 게시글 ID로 상세를 조회합니다.
	 *
	 * @param authHeader Authorization 헤더
	 * @param photoPostId 게시글 ID
	 * @return 게시글 상세 응답
	 */
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

	/**
	 * 제목 슬러그로 상세를 조회합니다.
	 *
	 * @param authHeader Authorization 헤더
	 * @param slug 제목 슬러그
	 * @return 게시글 상세 응답
	 */
	@GetMapping("/posts/by-slug/{slug}")
	public ResponseEntity<?> getPostBySlug(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable String slug
	){
		try{
			Long currentUserId = getOptionalUserIdFromToken(authHeader);
			PhotoBoardPostDto post = photoBoardService.getPostBySlug(currentUserId, slug);

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

	/**
	 * 게시글을 생성합니다.
	 *
	 * @param authHeader Authorization 헤더
	 * @param request 생성 요청 본문
	 * @return 생성된 게시글 응답
	 */
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

	/**
	 * 게시글을 수정합니다.
	 *
	 * @param authHeader Authorization 헤더
	 * @param photoPostId 게시글 ID
	 * @param request 수정 요청 본문
	 * @return 수정된 게시글 응답
	 */
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

	/**
	 * 게시글을 삭제합니다.
	 *
	 * @param authHeader Authorization 헤더
	 * @param photoPostId 게시글 ID
	 * @return 삭제 결과 응답
	 */
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

	/**
	 * 게시글 좋아요를 토글합니다.
	 *
	 * @param authHeader Authorization 헤더
	 * @param photoPostId 게시글 ID
	 * @return 좋아요 상태 반영 응답
	 */
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

	/**
	 * 예외 메시지에 따라 HTTP 상태 코드를 매핑합니다.
	 *
	 * @param message 예외 메시지
	 * @return 매핑된 상태 코드
	 */
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
