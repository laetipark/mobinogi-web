package com.example.mobinogi.service.board;

import com.example.mobinogi.dto.board.BoardCategoryDto;
import com.example.mobinogi.dto.board.BoardPostCreateRequest;
import com.example.mobinogi.dto.board.BoardPostDto;
import com.example.mobinogi.dto.board.BoardPostHistoryDto;
import com.example.mobinogi.dto.board.BoardPostUpdateRequest;
import com.example.mobinogi.entity.board.BoardPost;
import com.example.mobinogi.entity.board.BoardPostHistory;
import com.example.mobinogi.repository.BoardCategoryRepository;
import com.example.mobinogi.repository.BoardCommentRepository;
import com.example.mobinogi.repository.BoardPostHistoryRepository;
import com.example.mobinogi.repository.BoardPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Board post service.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardService{

	/** Board post repository. */
	private final BoardPostRepository postRepository;

	/** Board category repository. */
	private final BoardCategoryRepository categoryRepository;

	/** Board comment repository. */
	private final BoardCommentRepository commentRepository;

	/** Board post history repository. */
	private final BoardPostHistoryRepository postHistoryRepository;

	/**
	 * Returns all active categories ordered by display order.
	 *
	 * @return category DTO list
	 */
	public List<BoardCategoryDto> getAllCategories(){
		return categoryRepository.findByDeletedAtIsNullOrderByCategoryOrderAsc()
			.stream()
			.map(BoardCategoryDto::fromEntity)
			.collect(Collectors.toList());
	}

	/**
	 * Returns paged posts with optional category filter.
	 *
	 * @param categoryId optional category ID
	 * @param page page index
	 * @param size page size
	 * @return post DTO page
	 */
	public Page<BoardPostDto> getPosts(Long categoryId, int page, int size){
		Pageable pageable = PageRequest.of(page, size);
		Page<BoardPost> posts;

		if(categoryId != null){
			posts = postRepository.findByCategoryIdAndDeletedAtIsNullOrderByCreatedAtDesc(categoryId, pageable);
		}else{
			posts = postRepository.findByDeletedAtIsNullOrderByCreatedAtDesc(pageable);
		}

		return posts.map(post -> {
			long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
			return BoardPostDto.fromEntity(post, commentCount);
		});
	}

	/**
	 * Searches posts by keyword.
	 *
	 * @param keyword search keyword
	 * @param page page index
	 * @param size page size
	 * @return post DTO page
	 */
	public Page<BoardPostDto> searchPosts(String keyword, int page, int size){
		Pageable pageable = PageRequest.of(page, size);
		Page<BoardPost> posts = postRepository.searchPosts(keyword, pageable);
		return posts.map(post -> {
			long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
			return BoardPostDto.fromEntity(post, commentCount);
		});
	}

	/**
	 * Returns a post by ID and increments view count.
	 *
	 * @param postId post ID
	 * @return post DTO
	 */
	@Transactional
	public BoardPostDto getPost(Long postId){
		BoardPost post = postRepository.findByPostIdAndDeletedAtIsNull(postId)
			.orElseThrow(() -> new RuntimeException("Post not found."));

		post.setViewCount(post.getViewCount() + 1);
		postRepository.save(post);

		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(postId);
		return BoardPostDto.fromEntity(post, commentCount);
	}

	/**
	 * Returns latest post matching exact title and increments view count.
	 *
	 * @param title exact post title
	 * @return post DTO
	 */
	@Transactional
	public BoardPostDto getPostByTitle(String title){
		if(title == null || title.trim().isEmpty()){
			throw new RuntimeException("Post title is required.");
		}

		BoardPost post = postRepository.findFirstByTitleAndDeletedAtIsNullOrderByCreatedAtDesc(title.trim())
			.orElseThrow(() -> new RuntimeException("Post not found."));

		post.setViewCount(post.getViewCount() + 1);
		postRepository.save(post);

		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
		return BoardPostDto.fromEntity(post, commentCount);
	}

	/**
	 * Returns a post by title slug and increments view count.
	 *
	 * @param slug title slug
	 * @return post DTO
	 */
	@Transactional
	public BoardPostDto getPostBySlug(String slug){
		BoardPost post = findPostEntityBySlug(slug);

		post.setViewCount(post.getViewCount() + 1);
		postRepository.save(post);

		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
		return BoardPostDto.fromEntity(post, commentCount);
	}

	/**
	 * Returns a post by title slug without incrementing view count.
	 *
	 * @param slug title slug
	 * @return post DTO
	 */
	public BoardPostDto previewPostBySlug(String slug){
		BoardPost post = findPostEntityBySlug(slug);
		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
		return BoardPostDto.fromEntity(post, commentCount);
	}

	/**
	 * Returns latest active post without incrementing view count.
	 *
	 * @return post DTO
	 */
	public BoardPostDto previewLatestPost(){
		BoardPost post = postRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc()
			.stream()
			.findFirst()
			.orElseThrow(() -> new RuntimeException("Post not found."));
		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
		return BoardPostDto.fromEntity(post, commentCount);
	}

	/**
	 * Finds post entity by slug generated from title.
	 *
	 * @param slug title slug
	 * @return board post entity
	 */
	private BoardPost findPostEntityBySlug(String slug){
		if(slug == null || slug.trim().isEmpty()){
			throw new RuntimeException("Post slug is required.");
		}
		String normalizedSlug = toSlug(slug);
		return postRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc()
			.stream()
			.filter(candidate -> toSlug(candidate.getTitle()).equalsIgnoreCase(normalizedSlug))
			.findFirst()
			.orElseThrow(() -> new RuntimeException("Post not found."));
	}

	/**
	 * Converts raw text to URL-safe slug.
	 *
	 * @param value raw text
	 * @return normalized slug text
	 */
	private String toSlug(String value){
		if(value == null){
			return "";
		}
		return value.trim()
			.replaceAll("[^\\p{L}\\p{N}]+", "-")
			.replaceAll("-+", "-")
			.replaceAll("^-|-$", "");
	}

	/**
	 * Creates board post.
	 *
	 * @param userId author user ID
	 * @param request create request payload
	 * @return created post DTO
	 */
	@Transactional
	public BoardPostDto createPost(Long userId, BoardPostCreateRequest request){
		BoardPost post = BoardPost.builder()
			.categoryId(request.getCategoryId())
			.userId(userId)
			.title(request.getTitle())
			.content(request.getContent())
			.viewCount(0)
			.isWiki(request.getIsWiki())
			.build();

		post = postRepository.save(post);

		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
		return BoardPostDto.fromEntity(post, commentCount);
	}

	/**
	 * Updates board post and writes edit history.
	 *
	 * @param postId post ID
	 * @param userId requesting user ID
	 * @param request update request payload
	 * @return updated post DTO
	 */
	@Transactional
	public BoardPostDto updatePost(Long postId, Long userId, BoardPostUpdateRequest request){
		BoardPost post = postRepository.findByPostIdAndDeletedAtIsNull(postId)
			.orElseThrow(() -> new RuntimeException("Post not found."));

		if(!Boolean.TRUE.equals(post.getIsWiki()) && !post.getUserId().equals(userId)){
			throw new RuntimeException("No permission to edit this post.");
		}

		// Save previous snapshot before mutating post content.
		BoardPostHistory history = BoardPostHistory.builder()
			.postId(post.getPostId())
			.userId(userId)
			.title(post.getTitle())
			.content(post.getContent())
			.build();
		postHistoryRepository.save(history);

		post.setCategoryId(request.getCategoryId());
		post.setTitle(request.getTitle());
		post.setContent(request.getContent());

		if(post.getUserId().equals(userId) && request.getIsWiki() != null){
			post.setIsWiki(request.getIsWiki());
		}
		post = postRepository.save(post);

		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(postId);
		return BoardPostDto.fromEntity(post, commentCount);
	}

	/**
	 * Returns edit history list for a post.
	 *
	 * @param postId post ID
	 * @return history DTO list
	 */
	public List<BoardPostHistoryDto> getPostHistory(Long postId){
		return postHistoryRepository.findByPostIdOrderByCreatedAtDesc(postId)
			.stream()
			.map(BoardPostHistoryDto::fromEntity)
			.collect(Collectors.toList());
	}

	/**
	 * Soft-deletes a post.
	 *
	 * @param postId post ID
	 * @param userId requesting user ID
	 */
	@Transactional
	public void deletePost(Long postId, Long userId){
		BoardPost post = postRepository.findByPostIdAndDeletedAtIsNull(postId)
			.orElseThrow(() -> new RuntimeException("Post not found."));

		if(!post.getUserId().equals(userId)){
			throw new RuntimeException("No permission to delete this post.");
		}

		post.setDeletedAt(LocalDateTime.now());
		postRepository.save(post);
	}
}
