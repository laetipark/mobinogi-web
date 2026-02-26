package com.example.mobinogi.service.board;

import com.example.mobinogi.dto.board.*;
import com.example.mobinogi.entity.BoardPost;
import com.example.mobinogi.entity.BoardPostHistory;
import com.example.mobinogi.repository.BoardCategoryRepository;
import com.example.mobinogi.repository.BoardCommentRepository;
import com.example.mobinogi.repository.BoardPostHistoryRepository;
import com.example.mobinogi.repository.BoardPostRepository;
import com.example.mobinogi.service.discord.DiscordWebhookService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class BoardService{

	private final BoardPostRepository postRepository;
	private final BoardCategoryRepository categoryRepository;
	private final BoardCommentRepository commentRepository;
	private final BoardPostHistoryRepository postHistoryRepository;
	private final DiscordWebhookService discordWebhookService;

	public List<BoardCategoryDto> getAllCategories(){
		return categoryRepository.findByDeletedAtIsNullOrderByCategoryOrderAsc()
			.stream()
			.map(BoardCategoryDto::fromEntity)
			.collect(Collectors.toList());
	}

	public Page<BoardPostDto> getPosts(Long categoryId, String sourceType, int page, int size){
		Pageable pageable = PageRequest.of(page, size);
		Page<BoardPost> posts;

		if(categoryId != null && sourceType != null){
			posts = postRepository.findByCategoryIdAndSourceTypeAndDeletedAtIsNullOrderByCreatedAtDesc(
				categoryId, sourceType, pageable);
		}else if(categoryId != null){
			posts = postRepository.findByCategoryIdAndDeletedAtIsNullOrderByCreatedAtDesc(categoryId, pageable);
		}else if(sourceType != null){
			posts = postRepository.findBySourceTypeAndDeletedAtIsNullOrderByCreatedAtDesc(sourceType, pageable);
		}else{
			posts = postRepository.findByDeletedAtIsNullOrderByCreatedAtDesc(pageable);
		}

		return posts.map(post -> {
			long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
			return BoardPostDto.fromEntity(post, commentCount);
		});
	}

	public Page<BoardPostDto> searchPosts(String keyword, int page, int size){
		Pageable pageable = PageRequest.of(page, size);
		Page<BoardPost> posts = postRepository.searchPosts(keyword, pageable);
		return posts.map(post -> {
			long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
			return BoardPostDto.fromEntity(post, commentCount);
		});
	}

	@Transactional
	public BoardPostDto getPost(Long postId){
		BoardPost post = postRepository.findByPostIdAndDeletedAtIsNull(postId)
			.orElseThrow(() -> new RuntimeException("Post not found."));

		post.setViewCount(post.getViewCount() + 1);
		postRepository.save(post);

		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(postId);
		return BoardPostDto.fromEntity(post, commentCount);
	}

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

	@Transactional
	public BoardPostDto getPostBySlug(String slug){
		BoardPost post = findPostEntityBySlug(slug);

		post.setViewCount(post.getViewCount() + 1);
		postRepository.save(post);

		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
		return BoardPostDto.fromEntity(post, commentCount);
	}

	public BoardPostDto previewPostBySlug(String slug){
		BoardPost post = findPostEntityBySlug(slug);
		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
		return BoardPostDto.fromEntity(post, commentCount);
	}

	public BoardPostDto previewLatestPost(){
		BoardPost post = postRepository.findAllByDeletedAtIsNullOrderByCreatedAtDesc()
			.stream()
			.findFirst()
			.orElseThrow(() -> new RuntimeException("Post not found."));
		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
		return BoardPostDto.fromEntity(post, commentCount);
	}

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

	private String toSlug(String value){
		if(value == null){
			return "";
		}
		return value.trim()
			.replaceAll("[^\\p{L}\\p{N}]+", "-")
			.replaceAll("-+", "-")
			.replaceAll("^-|-$", "");
	}

	@Transactional
	public BoardPostDto createPost(Long userId, BoardPostCreateRequest request){
		BoardPost post = BoardPost.builder()
			.categoryId(request.getCategoryId())
			.userId(userId)
			.title(request.getTitle())
			.content(request.getContent())
			.sourceType("USER")
			.viewCount(0)
			.isWiki(request.getIsWiki())
			.build();

		post = postRepository.save(post);

		// Send Discord webhook notification asynchronously.
		try{
			discordWebhookService.sendNewPostNotification(post);
		}catch(Exception e){
			log.error("Failed to send Discord notification: {}", e.getMessage());
		}

		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
		return BoardPostDto.fromEntity(post, commentCount);
	}

	@Transactional
	public BoardPostDto updatePost(Long postId, Long userId, BoardPostUpdateRequest request){
		BoardPost post = postRepository.findByPostIdAndDeletedAtIsNull(postId)
			.orElseThrow(() -> new RuntimeException("Post not found."));

		if(!Boolean.TRUE.equals(post.getIsWiki()) && !post.getUserId().equals(userId)){
			throw new RuntimeException("No permission to edit this post.");
		}

		if(!"USER".equals(post.getSourceType())){
			throw new RuntimeException("External posts cannot be edited.");
		}

		// Save previous content to history before update.
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

	public List<BoardPostHistoryDto> getPostHistory(Long postId){
		return postHistoryRepository.findByPostIdOrderByCreatedAtDesc(postId)
			.stream()
			.map(BoardPostHistoryDto::fromEntity)
			.collect(Collectors.toList());
	}

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
