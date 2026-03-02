package com.example.mobinogi.controller.board;

import com.example.mobinogi.dto.board.BoardCategoryDto;
import com.example.mobinogi.dto.board.BoardCommentCreateRequest;
import com.example.mobinogi.dto.board.BoardCommentDto;
import com.example.mobinogi.dto.board.BoardCommentUpdateRequest;
import com.example.mobinogi.dto.board.BoardPostCreateRequest;
import com.example.mobinogi.dto.board.BoardPostDto;
import com.example.mobinogi.dto.board.BoardPostHistoryDto;
import com.example.mobinogi.dto.board.BoardPostUpdateRequest;
import com.example.mobinogi.service.board.BoardCommentService;
import com.example.mobinogi.service.board.BoardService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Community board API controller.
 */
@RestController
@RequestMapping({"/api/board", "/api/boards"})
@RequiredArgsConstructor
public class BoardController{

	/** Board post service. */
	private final BoardService boardService;

	/** Board comment service. */
	private final BoardCommentService commentService;

	/** JWT utility for token validation. */
	private final JwtUtil jwtUtil;

	/**
	 * Extracts user ID from bearer token.
	 *
	 * @param authHeader authorization header
	 * @return authenticated user ID
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
	 * Returns board categories.
	 *
	 * @return category list response
	 */
	@GetMapping("/categories")
	public ResponseEntity<?> getCategories(){
		try{
			List<BoardCategoryDto> categories = boardService.getAllCategories();
			Map<String, Object> response = success("categories", categories);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Returns board post page.
	 *
	 * @param categoryId optional category filter
	 * @param keyword optional keyword filter
	 * @param page page index
	 * @param size page size
	 * @return post page response
	 */
	@GetMapping("/posts")
	public ResponseEntity<?> getPosts(
		@RequestParam(required = false) Long categoryId,
		@RequestParam(required = false) String keyword,
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "20") int size
	){
		try{
			Page<BoardPostDto> posts;
			if(keyword != null && !keyword.trim().isEmpty()){
				posts = boardService.searchPosts(keyword.trim(), page, size);
			}else{
				posts = boardService.getPosts(categoryId, page, size);
			}
			return ResponseEntity.ok(success("data", posts));
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Returns a board post by slug.
	 *
	 * @param slug post slug
	 * @return board post response
	 */
	@GetMapping("/posts/by-slug")
	public ResponseEntity<?> getPostBySlug(@RequestParam String slug){
		try{
			BoardPostDto post = boardService.getPostBySlug(slug);
			return ResponseEntity.ok(success("post", post));
		}catch(Exception e){
			return ResponseEntity.status(404).body(failure(e.getMessage()));
		}
	}

	/**
	 * Returns a board post by title.
	 *
	 * @param title post title
	 * @return board post response
	 */
	@GetMapping("/posts/by-title")
	public ResponseEntity<?> getPostByTitle(@RequestParam String title){
		try{
			BoardPostDto post = boardService.getPostByTitle(title);
			return ResponseEntity.ok(success("post", post));
		}catch(Exception e){
			return ResponseEntity.status(404).body(failure(e.getMessage()));
		}
	}

	/**
	 * Returns a board post by ID.
	 *
	 * @param postId post ID
	 * @return board post response
	 */
	@GetMapping("/posts/{postId}")
	public ResponseEntity<?> getPost(@PathVariable Long postId){
		try{
			BoardPostDto post = boardService.getPost(postId);
			return ResponseEntity.ok(success("post", post));
		}catch(Exception e){
			return ResponseEntity.status(404).body(failure(e.getMessage()));
		}
	}

	/**
	 * Creates a board post.
	 *
	 * @param authHeader authorization header
	 * @param request create request payload
	 * @return created post response
	 */
	@PostMapping("/posts")
	public ResponseEntity<?> createPost(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody BoardPostCreateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			BoardPostDto post = boardService.createPost(userId, request);
			Map<String, Object> response = success("post", post);
			response.put("message", "Post created.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.status(resolveErrorStatus(e.getMessage())).body(failure(e.getMessage()));
		}
	}

	/**
	 * Updates a board post.
	 *
	 * @param authHeader authorization header
	 * @param postId post ID
	 * @param request update request payload
	 * @return updated post response
	 */
	@PutMapping("/posts/{postId}")
	public ResponseEntity<?> updatePost(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long postId,
		@RequestBody BoardPostUpdateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			BoardPostDto post = boardService.updatePost(postId, userId, request);
			Map<String, Object> response = success("post", post);
			response.put("message", "Post updated.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.status(resolveErrorStatus(e.getMessage())).body(failure(e.getMessage()));
		}
	}

	/**
	 * Deletes a board post.
	 *
	 * @param authHeader authorization header
	 * @param postId post ID
	 * @return delete response
	 */
	@DeleteMapping("/posts/{postId}")
	public ResponseEntity<?> deletePost(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long postId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			boardService.deletePost(postId, userId);
			Map<String, Object> response = success("postId", postId);
			response.put("message", "Post deleted.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.status(resolveErrorStatus(e.getMessage())).body(failure(e.getMessage()));
		}
	}

	/**
	 * Returns post edit history.
	 *
	 * @param postId post ID
	 * @return history response
	 */
	@GetMapping("/posts/{postId}/history")
	public ResponseEntity<?> getPostHistory(@PathVariable Long postId){
		try{
			List<BoardPostHistoryDto> history = boardService.getPostHistory(postId);
			return ResponseEntity.ok(success("history", history));
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Returns post comments.
	 *
	 * @param postId post ID
	 * @return comment list response
	 */
	@GetMapping("/posts/{postId}/comments")
	public ResponseEntity<?> getComments(@PathVariable Long postId){
		try{
			List<BoardCommentDto> comments = commentService.getComments(postId);
			return ResponseEntity.ok(success("comments", comments));
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Creates a comment.
	 *
	 * @param authHeader authorization header
	 * @param postId post ID
	 * @param request create request payload
	 * @return created comment response
	 */
	@PostMapping("/posts/{postId}/comments")
	public ResponseEntity<?> createComment(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long postId,
		@RequestBody BoardCommentCreateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			BoardCommentDto comment = commentService.createComment(postId, userId, request);
			Map<String, Object> response = success("comment", comment);
			response.put("message", "Comment created.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.status(resolveErrorStatus(e.getMessage())).body(failure(e.getMessage()));
		}
	}

	/**
	 * Updates a comment.
	 *
	 * @param authHeader authorization header
	 * @param commentId comment ID
	 * @param request update request payload
	 * @return updated comment response
	 */
	@PutMapping("/comments/{commentId}")
	public ResponseEntity<?> updateComment(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long commentId,
		@RequestBody BoardCommentUpdateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			BoardCommentDto comment = commentService.updateComment(commentId, userId, request);
			Map<String, Object> response = success("comment", comment);
			response.put("message", "Comment updated.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.status(resolveErrorStatus(e.getMessage())).body(failure(e.getMessage()));
		}
	}

	/**
	 * Deletes a comment.
	 *
	 * @param authHeader authorization header
	 * @param commentId comment ID
	 * @return delete response
	 */
	@DeleteMapping("/comments/{commentId}")
	public ResponseEntity<?> deleteComment(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long commentId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			commentService.deleteComment(commentId, userId);
			Map<String, Object> response = success("commentId", commentId);
			response.put("message", "Comment deleted.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.status(resolveErrorStatus(e.getMessage())).body(failure(e.getMessage()));
		}
	}

	/**
	 * Maps service error message to HTTP status.
	 *
	 * @param message error message
	 * @return mapped status code
	 */
	private int resolveErrorStatus(String message){
		if(message == null){
			return 400;
		}
		String lower = message.toLowerCase();
		if(lower.contains("token")){
			return 401;
		}
		if(lower.contains("not found")){
			return 404;
		}
		if(lower.contains("only the author")){
			return 403;
		}
		return 400;
	}

	/**
	 * Builds standard success response.
	 *
	 * @param key payload key
	 * @param value payload value
	 * @return response body
	 */
	private Map<String, Object> success(String key, Object value){
		Map<String, Object> response = new HashMap<>();
		response.put("success", true);
		response.put(key, value);
		response.put("data", value);
		return response;
	}

	/**
	 * Builds standard failure response.
	 *
	 * @param message failure message
	 * @return response body
	 */
	private Map<String, Object> failure(String message){
		Map<String, Object> response = new HashMap<>();
		response.put("success", false);
		response.put("message", message);
		return response;
	}
}
