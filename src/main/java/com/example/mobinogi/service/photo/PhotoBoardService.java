package com.example.mobinogi.service.photo;

import com.example.mobinogi.dto.photo.PhotoBoardPostCreateRequest;
import com.example.mobinogi.dto.photo.PhotoBoardPostDto;
import com.example.mobinogi.entity.board.PhotoBoardPost;
import com.example.mobinogi.entity.board.PhotoBoardPostLike;
import com.example.mobinogi.repository.PhotoBoardPostLikeRepository;
import com.example.mobinogi.repository.PhotoBoardPostRepository;
import com.example.mobinogi.service.file.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 포토 게시판 도메인 서비스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PhotoBoardService{

	/** 포토 게시글 리포지토리 */
	private final PhotoBoardPostRepository photoBoardPostRepository;

	/** 게시글 좋아요 리포지토리 */
	private final PhotoBoardPostLikeRepository photoBoardPostLikeRepository;

	/** 임시 파일 승격/저장 서비스 */
	private final FileStorageService fileStorageService;

	/**
	 * 포토 게시글 목록을 조회합니다.
	 *
	 * @param currentUserId 현재 사용자 ID(비로그인 시 null)
	 * @param keyword 검색 키워드
	 * @param tag 태그 필터
	 * @param page 페이지 번호
	 * @param size 페이지 크기
	 * @return 게시글 페이지
	 */
	public Page<PhotoBoardPostDto> getPosts(Long currentUserId, String keyword, String tag, int page, int size){
		Pageable pageable = PageRequest.of(page, size);
		String normalizedKeyword = normalize(keyword);
		String normalizedTag = normalizeTagFilter(tag);

		Page<PhotoBoardPost> posts = photoBoardPostRepository.searchPosts(normalizedKeyword, normalizedTag, pageable);
		Set<Long> likedPostIds = resolveLikedPostIds(currentUserId, posts);
		return posts.map(post -> PhotoBoardPostDto.fromEntity(post, likedPostIds.contains(post.getPhotoPostId())));
	}

	/**
	 * 게시글 ID로 상세를 조회하고 조회수를 증가시킵니다.
	 *
	 * @param currentUserId 현재 사용자 ID
	 * @param photoPostId 게시글 ID
	 * @return 게시글 상세 DTO
	 */
	@Transactional
	public PhotoBoardPostDto getPost(Long currentUserId, Long photoPostId){
		PhotoBoardPost post = photoBoardPostRepository.findByPhotoPostIdAndDeletedAtIsNull(photoPostId)
			.orElseThrow(() -> new RuntimeException("Photo post not found."));

		// 상세 조회 시 조회수 증가
		post.setViewCount(post.getViewCount() + 1);
		photoBoardPostRepository.save(post);

		return PhotoBoardPostDto.fromEntity(post, isLikedByUser(photoPostId, currentUserId));
	}

	/**
	 * 제목 슬러그로 상세를 조회하고 조회수를 증가시킵니다.
	 *
	 * @param currentUserId 현재 사용자 ID
	 * @param slug 제목 슬러그
	 * @return 게시글 상세 DTO
	 */
	@Transactional
	public PhotoBoardPostDto getPostBySlug(Long currentUserId, String slug){
		String normalizedSlug = toTitleSlug(slug);
		if(normalizedSlug.isEmpty()){
			throw new RuntimeException("Photo post slug is required.");
		}

		PhotoBoardPost post = photoBoardPostRepository.findByDeletedAtIsNullOrderByCreatedAtDesc()
			.stream()
			.filter(candidate -> toTitleSlug(candidate.getTitle()).equals(normalizedSlug))
			.findFirst()
			.orElseThrow(() -> new RuntimeException("Photo post not found."));

		post.setViewCount(post.getViewCount() + 1);
		photoBoardPostRepository.save(post);

		return PhotoBoardPostDto.fromEntity(post, isLikedByUser(post.getPhotoPostId(), currentUserId));
	}

	/**
	 * 게시글을 생성합니다.
	 *
	 * @param userId 작성자 사용자 ID
	 * @param request 생성 요청
	 * @return 생성된 게시글 DTO
	 */
	@Transactional
	public PhotoBoardPostDto createPost(Long userId, PhotoBoardPostCreateRequest request){
		if(request.getTitle() == null || request.getTitle().trim().isEmpty()){
			throw new RuntimeException("Title is required.");
		}
		List<String> normalizedImageUrls = normalizeAndResolveImageUrls(userId, request.getImageUrls());

		PhotoBoardPost post = PhotoBoardPost.builder()
			.userId(userId)
			.title(request.getTitle().trim())
			.description(request.getDescription() == null ? null : request.getDescription().trim())
			.imageUrl(serializeImageUrls(normalizedImageUrls))
			.tags(joinTags(request.getTags()))
			.viewCount(0)
			.likeCount(0)
			.build();

		post = photoBoardPostRepository.save(post);
		return PhotoBoardPostDto.fromEntity(post, false);
	}

	/**
	 * 게시글을 수정합니다.
	 *
	 * @param userId 요청 사용자 ID
	 * @param photoPostId 게시글 ID
	 * @param request 수정 요청
	 * @return 수정된 게시글 DTO
	 */
	@Transactional
	public PhotoBoardPostDto updatePost(Long userId, Long photoPostId, PhotoBoardPostCreateRequest request){
		PhotoBoardPost post = photoBoardPostRepository.findByPhotoPostIdAndDeletedAtIsNull(photoPostId)
			.orElseThrow(() -> new RuntimeException("Photo post not found."));
		assertOwner(userId, post);

		if(request.getTitle() == null || request.getTitle().trim().isEmpty()){
			throw new RuntimeException("Title is required.");
		}
		List<String> normalizedImageUrls = normalizeAndResolveImageUrls(userId, request.getImageUrls());

		post.setTitle(request.getTitle().trim());
		post.setDescription(request.getDescription() == null ? null : request.getDescription().trim());
		post.setImageUrl(serializeImageUrls(normalizedImageUrls));
		post.setTags(joinTags(request.getTags()));
		post = photoBoardPostRepository.save(post);
		return PhotoBoardPostDto.fromEntity(post, isLikedByUser(post.getPhotoPostId(), userId));
	}

	/**
	 * 게시글 좋아요를 토글합니다.
	 *
	 * @param userId 요청 사용자 ID
	 * @param photoPostId 게시글 ID
	 * @return 좋아요 상태가 반영된 게시글 DTO
	 */
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

	/**
	 * 게시글을 소프트 삭제합니다.
	 *
	 * @param userId 요청 사용자 ID
	 * @param photoPostId 게시글 ID
	 */
	@Transactional
	public void deletePost(Long userId, Long photoPostId){
		PhotoBoardPost post = photoBoardPostRepository.findByPhotoPostIdAndDeletedAtIsNull(photoPostId)
			.orElseThrow(() -> new RuntimeException("Photo post not found."));
		assertOwner(userId, post);

		post.setDeletedAt(LocalDateTime.now());
		photoBoardPostRepository.save(post);
	}

	/**
	 * 공백 문자열을 null로 정규화합니다.
	 */
	private String normalize(String value){
		if(value == null || value.trim().isEmpty()){
			return null;
		}
		return value.trim();
	}

	/**
	 * 제목 문자열을 URL 친화적인 슬러그로 변환합니다.
	 */
	private String toTitleSlug(String value){
		if(value == null){
			return "";
		}
		return value
			.trim()
			.replaceAll("\\s+", "-")
			.replaceAll("-{2,}", "-")
			.toLowerCase(Locale.ROOT);
	}

	/**
	 * 태그 필터 문자열을 API 조회용 값으로 정규화합니다.
	 */
	private String normalizeTagFilter(String value){
		String normalizedTag = normalizeTag(value);
		return normalizedTag.isEmpty() ? null : normalizedTag;
	}

	/**
	 * 단일 태그 문자열을 정규화합니다.
	 */
	private String normalizeTag(String value){
		if(value == null){
			return "";
		}
		return value.trim().replaceFirst("^#+", "").trim();
	}

	/**
	 * 태그 목록을 정규화하고 저장 문자열로 결합합니다.
	 */
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

	/**
	 * 단일 이미지 URL을 검증/정규화하고 임시 파일이면 최종 경로로 승격합니다.
	 */
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

	/**
	 * 이미지 URL 목록을 정규화/중복 제거/승격 처리합니다.
	 */
	private List<String> normalizeAndResolveImageUrls(Long userId, List<String> imageUrls){
		List<String> rawUrls = new ArrayList<>();
		if(imageUrls != null){
			rawUrls.addAll(
				imageUrls.stream()
					.map(value -> value == null ? "" : value.trim())
					.filter(value -> !value.isEmpty())
					.toList()
			);
		}
		if(rawUrls.isEmpty()){
			throw new RuntimeException("Image URLs are required.");
		}

		List<String> deduped = new ArrayList<>(new LinkedHashSet<>(rawUrls));
		List<String> resolved = deduped.stream()
			.map(url -> normalizeAndResolveImageUrl(userId, url))
			.toList();
		if(resolved.isEmpty()){
			throw new RuntimeException("Image URLs are required.");
		}
		return resolved;
	}

	/**
	 * 이미지 URL 목록을 저장 문자열로 직렬화합니다.
	 */
	private String serializeImageUrls(List<String> imageUrls){
		if(imageUrls == null || imageUrls.isEmpty()){
			return null;
		}
		return String.join("\n", imageUrls);
	}

	/**
	 * 게시글 작성자 본인인지 검증합니다.
	 */
	private void assertOwner(Long userId, PhotoBoardPost post){
		if(userId == null || post.getUserId() == null || !userId.equals(post.getUserId())){
			throw new RuntimeException("Only the author can modify this post.");
		}
	}

	/**
	 * 현재 페이지 게시글 중 사용자가 좋아요한 게시글 ID 집합을 조회합니다.
	 */
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

	/**
	 * 특정 게시글을 사용자가 좋아요했는지 조회합니다.
	 */
	private boolean isLikedByUser(Long photoPostId, Long userId){
		if(photoPostId == null || userId == null){
			return false;
		}
		return photoBoardPostLikeRepository.findByPhotoPostIdAndUserId(photoPostId, userId).isPresent();
	}
}
