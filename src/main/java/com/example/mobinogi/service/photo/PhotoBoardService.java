package com.example.mobinogi.service.photo;

import com.example.mobinogi.dto.photo.PhotoBoardPostDto;
import com.example.mobinogi.dto.photo.PhotoBoardPostCreateRequest;
import com.example.mobinogi.entity.PhotoBoardPost;
import com.example.mobinogi.entity.PhotoBoardPostLike;
import com.example.mobinogi.repository.PhotoBoardPostLikeRepository;
import com.example.mobinogi.repository.PhotoBoardPostRepository;
import com.example.mobinogi.service.file.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PhotoBoardService{

	private final PhotoBoardPostRepository photoBoardPostRepository;
	private final PhotoBoardPostLikeRepository photoBoardPostLikeRepository;
	private final FileStorageService fileStorageService;

	public Page<PhotoBoardPostDto> getPosts(Long currentUserId, String keyword, String tag, int page, int size){
		Pageable pageable = PageRequest.of(page, size);
		String normalizedKeyword = normalize(keyword);
		String normalizedTag = normalizeTagFilter(tag);

		Page<PhotoBoardPost> posts = photoBoardPostRepository.searchPosts(normalizedKeyword, normalizedTag, pageable);
		Set<Long> likedPostIds = resolveLikedPostIds(currentUserId, posts);
		return posts.map(post -> PhotoBoardPostDto.fromEntity(post, likedPostIds.contains(post.getPhotoPostId())));
	}

	@Transactional
	public PhotoBoardPostDto getPost(Long currentUserId, Long photoPostId){
		PhotoBoardPost post = photoBoardPostRepository.findByPhotoPostIdAndDeletedAtIsNull(photoPostId)
			.orElseThrow(() -> new RuntimeException("Photo post not found."));

		post.setViewCount(post.getViewCount() + 1);
		photoBoardPostRepository.save(post);

		return PhotoBoardPostDto.fromEntity(post, isLikedByUser(photoPostId, currentUserId));
	}

	@Transactional
	public PhotoBoardPostDto createPost(Long userId, PhotoBoardPostCreateRequest request){
		if(request.getTitle() == null || request.getTitle().trim().isEmpty()){
			throw new RuntimeException("Title is required.");
		}
		if(request.getImageUrl() == null || request.getImageUrl().trim().isEmpty()){
			throw new RuntimeException("Image URL is required.");
		}

		String normalizedImageUrl = normalizeAndResolveImageUrl(userId, request.getImageUrl());

		PhotoBoardPost post = PhotoBoardPost.builder()
			.userId(userId)
			.title(request.getTitle().trim())
			.description(request.getDescription() == null ? null : request.getDescription().trim())
			.imageUrl(normalizedImageUrl)
			.tags(joinTags(request.getTags()))
			.viewCount(0)
			.likeCount(0)
			.build();

		post = photoBoardPostRepository.save(post);
		return PhotoBoardPostDto.fromEntity(post, false);
	}

	@Transactional
	public PhotoBoardPostDto updatePost(Long userId, Long photoPostId, PhotoBoardPostCreateRequest request){
		PhotoBoardPost post = photoBoardPostRepository.findByPhotoPostIdAndDeletedAtIsNull(photoPostId)
			.orElseThrow(() -> new RuntimeException("Photo post not found."));
		assertOwner(userId, post);

		if(request.getTitle() == null || request.getTitle().trim().isEmpty()){
			throw new RuntimeException("Title is required.");
		}
		if(request.getImageUrl() == null || request.getImageUrl().trim().isEmpty()){
			throw new RuntimeException("Image URL is required.");
		}

		post.setTitle(request.getTitle().trim());
		post.setDescription(request.getDescription() == null ? null : request.getDescription().trim());
		post.setImageUrl(normalizeAndResolveImageUrl(userId, request.getImageUrl()));
		post.setTags(joinTags(request.getTags()));
		post = photoBoardPostRepository.save(post);
		return PhotoBoardPostDto.fromEntity(post, isLikedByUser(post.getPhotoPostId(), userId));
	}

	@Transactional
	public PhotoBoardPostDto toggleLike(Long userId, Long photoPostId){
		PhotoBoardPost post = photoBoardPostRepository.findByPhotoPostIdAndDeletedAtIsNull(photoPostId)
			.orElseThrow(() -> new RuntimeException("Photo post not found."));

		photoBoardPostLikeRepository.findByPhotoPostIdAndUserId(photoPostId, userId).ifPresentOrElse(
			photoBoardPostLikeRepository::delete,
			() -> photoBoardPostLikeRepository.save(
				PhotoBoardPostLike.builder()
					.photoPostId(photoPostId)
					.userId(userId)
					.build()
			)
		);

		long likeCount = photoBoardPostLikeRepository.countByPhotoPostId(photoPostId);
		post.setLikeCount((int) likeCount);
		post = photoBoardPostRepository.save(post);
		return PhotoBoardPostDto.fromEntity(post, isLikedByUser(photoPostId, userId));
	}

	@Transactional
	public void deletePost(Long userId, Long photoPostId){
		PhotoBoardPost post = photoBoardPostRepository.findByPhotoPostIdAndDeletedAtIsNull(photoPostId)
			.orElseThrow(() -> new RuntimeException("Photo post not found."));
		assertOwner(userId, post);

		post.setDeletedAt(LocalDateTime.now());
		photoBoardPostRepository.save(post);
	}

	private String normalize(String value){
		if(value == null || value.trim().isEmpty()){
			return null;
		}
		return value.trim();
	}

	private String normalizeTagFilter(String value){
		String normalizedTag = normalizeTag(value);
		return normalizedTag.isEmpty() ? null : normalizedTag;
	}

	private String normalizeTag(String value){
		if(value == null){
			return "";
		}
		return value.trim().replaceFirst("^#+", "").trim();
	}

	private String joinTags(List<String> tags){
		if(tags == null || tags.isEmpty()){
			return null;
		}
		List<String> normalized = tags.stream()
			.map(this::normalizeTag)
			.filter(tag -> !tag.isEmpty())
			.distinct()
			.collect(Collectors.toList());

		if(normalized.isEmpty()){
			return null;
		}
		return String.join(",", normalized);
	}

	private String normalizeAndResolveImageUrl(Long userId, String imageUrl){
		String normalized = imageUrl == null ? "" : imageUrl.trim();
		if(normalized.isEmpty()){
			throw new RuntimeException("Image URL is required.");
		}

		if(normalized.startsWith("/api/files/_tmp-")){
			try{
				return fileStorageService.promoteTempFile(normalized, "board", userId);
			}catch(Exception e){
				throw new RuntimeException("Failed to finalize temp image: " + e.getMessage(), e);
			}
		}

		if(normalized.startsWith("/api/files/board/")){
			return normalized;
		}

		if(normalized.startsWith("http://") || normalized.startsWith("https://")){
			return normalized;
		}

		throw new RuntimeException("Unsupported image URL. Upload image first.");
	}

	private void assertOwner(Long userId, PhotoBoardPost post){
		if(userId == null || post.getUserId() == null || !userId.equals(post.getUserId())){
			throw new RuntimeException("Only the author can modify this post.");
		}
	}

	private Set<Long> resolveLikedPostIds(Long userId, Page<PhotoBoardPost> posts){
		if(userId == null || posts.isEmpty()){
			return Collections.emptySet();
		}
		List<Long> postIds = posts.getContent().stream()
			.map(PhotoBoardPost::getPhotoPostId)
			.collect(Collectors.toList());
		if(postIds.isEmpty()){
			return Collections.emptySet();
		}
		return new HashSet<>(photoBoardPostLikeRepository.findLikedPhotoPostIdsByUserIdAndPhotoPostIds(userId, postIds));
	}

	private boolean isLikedByUser(Long photoPostId, Long userId){
		if(photoPostId == null || userId == null){
			return false;
		}
		return photoBoardPostLikeRepository.findByPhotoPostIdAndUserId(photoPostId, userId).isPresent();
	}
}
