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
			.orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));
		
		post.setViewCount(post.getViewCount() + 1);
		postRepository.save(post);
		
		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(postId);
		return BoardPostDto.fromEntity(post, commentCount);
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
		
		// Discord webhook 알림 (비동기)
		try{
			discordWebhookService.sendNewPostNotification(post);
		}catch(Exception e){
			log.error("Discord 알림 전송 실패: {}", e.getMessage());
		}
		
		long commentCount = commentRepository.countByPostIdAndDeletedAtIsNull(post.getPostId());
		return BoardPostDto.fromEntity(post, commentCount);
	}
	
	@Transactional
	public BoardPostDto updatePost(Long postId, Long userId, BoardPostUpdateRequest request){
		BoardPost post = postRepository.findByPostIdAndDeletedAtIsNull(postId)
			.orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));
		
		if(!Boolean.TRUE.equals(post.getIsWiki()) && !post.getUserId().equals(userId)){
			throw new RuntimeException("게시글 수정 권한이 없습니다.");
		}

		if(!"USER".equals(post.getSourceType())){
			throw new RuntimeException("외부 연동 게시글은 수정할 수 없습니다.");
		}

		// 수정 전 기존 내용을 히스토리로 저장
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

		// 위키↔일반 전환은 원작성자만 가능
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
			.orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));
		
		if(!post.getUserId().equals(userId)){
			throw new RuntimeException("게시글 삭제 권한이 없습니다.");
		}
		
		post.setDeletedAt(LocalDateTime.now());
		postRepository.save(post);
	}
}
