package com.example.mobinogi.controller.board;

import com.example.mobinogi.dto.board.*;
import com.example.mobinogi.service.board.BoardCommentService;
import com.example.mobinogi.service.board.BoardExternalService;
import com.example.mobinogi.service.board.BoardService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/board")
@RequiredArgsConstructor
@Slf4j
public class BoardController{

	private final BoardService boardService;
	private final BoardCommentService commentService;
	private final BoardExternalService externalService;
	private final JwtUtil jwtUtil;

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

	// GET /api/board/categories
	@GetMapping("/categories")
	public ResponseEntity<?> getCategories(){
		try{
			List<BoardCategoryDto> categories = boardService.getAllCategories();

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("categories", categories);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(errorResponse);
		}
	}

	// GET /api/board/posts
	@GetMapping("/posts")
	public ResponseEntity<?> getPosts(
		@RequestParam(required = false) Long categoryId,
		@RequestParam(required = false) String sourceType,
		@RequestParam(required = false) String keyword,
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "20") int size
	){
		try{
			Page<BoardPostDto> posts;

			if(keyword != null && !keyword.trim().isEmpty()){
				posts = boardService.searchPosts(keyword.trim(), page, size);
			}else{
				posts = boardService.getPosts(categoryId, sourceType, page, size);
			}

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

	// GET /api/board/external/discord - Redis에서 Discord 게시글 조회
	@GetMapping("/external/discord")
	public ResponseEntity<?> getDiscordPosts(){
		try{
			List<BoardPostDto> posts = externalService.getDiscordPosts();

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

	// GET /api/board/posts/by-slug?slug={slug}
	@GetMapping("/posts/by-slug")
	public ResponseEntity<?> getPostBySlug(@RequestParam String slug){
		try{
			BoardPostDto post = boardService.getPostBySlug(slug);

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

	// GET /api/board/posts/by-title?title={title}
	@GetMapping("/posts/by-title")
	public ResponseEntity<?> getPostByTitle(@RequestParam String title){
		try{
			BoardPostDto post = boardService.getPostByTitle(title);

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

	// GET /api/board/posts/{postId}
	@GetMapping("/posts/{postId}")
	public ResponseEntity<?> getPost(@PathVariable Long postId){
		try{
			BoardPostDto post = boardService.getPost(postId);

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

	// POST /api/board/posts
	@PostMapping("/posts")
	public ResponseEntity<?> createPost(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody BoardPostCreateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			BoardPostDto post = boardService.createPost(userId, request);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "게시글이 작성되었습니다.");
			response.put("post", post);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	// PUT /api/board/posts/{postId}
	@PutMapping("/posts/{postId}")
	public ResponseEntity<?> updatePost(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long postId,
		@RequestBody BoardPostUpdateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			BoardPostDto post = boardService.updatePost(postId, userId, request);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "게시글이 수정되었습니다.");
			response.put("post", post);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	// DELETE /api/board/posts/{postId}
	@DeleteMapping("/posts/{postId}")
	public ResponseEntity<?> deletePost(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long postId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			boardService.deletePost(postId, userId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "게시글이 삭제되었습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	// GET /api/board/posts/{postId}/history
	@GetMapping("/posts/{postId}/history")
	public ResponseEntity<?> getPostHistory(@PathVariable Long postId){
		try{
			List<BoardPostHistoryDto> history = boardService.getPostHistory(postId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("history", history);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(errorResponse);
		}
	}

	// GET /api/board/posts/{postId}/comments
	@GetMapping("/posts/{postId}/comments")
	public ResponseEntity<?> getComments(@PathVariable Long postId){
		try{
			List<BoardCommentDto> comments = commentService.getComments(postId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("comments", comments);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(errorResponse);
		}
	}

	// POST /api/board/posts/{postId}/comments
	@PostMapping("/posts/{postId}/comments")
	public ResponseEntity<?> createComment(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long postId,
		@RequestBody BoardCommentCreateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			BoardCommentDto comment = commentService.createComment(postId, userId, request);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "댓글이 작성되었습니다.");
			response.put("comment", comment);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	// PUT /api/board/comments/{commentId}
	@PutMapping("/comments/{commentId}")
	public ResponseEntity<?> updateComment(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long commentId,
		@RequestBody BoardCommentUpdateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			BoardCommentDto comment = commentService.updateComment(commentId, userId, request);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "댓글이 수정되었습니다.");
			response.put("comment", comment);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	// 디버그 및 동기화 엔드포인트는 제거됨
	// Discord 동기화는 Node.js 크롤러에서 처리
	// (필요시 Node.js 크롤러를 수동으로 실행하거나 PM2로 스케줄링)

	// DELETE /api/board/comments/{commentId}
	@DeleteMapping("/comments/{commentId}")
	public ResponseEntity<?> deleteComment(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long commentId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			commentService.deleteComment(commentId, userId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "댓글이 삭제되었습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}
}
