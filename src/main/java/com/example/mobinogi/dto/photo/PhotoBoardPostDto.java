package com.example.mobinogi.dto.photo;

import com.example.mobinogi.entity.board.PhotoBoardPost;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
/**
 * 포토 게시글 응답 DTO입니다.
 */
public class PhotoBoardPostDto{

	/** 게시글 ID */
	private Long photoPostId;

	/** 작성자 사용자 ID */
	private Long userId;

	/** 작성자 닉네임 */
	private String authorNickname;

	/** 작성자 프로필 이미지 URL */
	private String authorProfileImage;

	/** 게시글 제목 */
	private String title;

	/** 게시글 본문 설명 */
	private String description;

	/** 게시글 이미지 URL 목록 */
	private List<String> imageUrls;

	/** 게시글 태그 목록 */
	private List<String> tags;

	/** 조회수 */
	private Integer viewCount;

	/** 좋아요 수 */
	private Integer likeCount;

	/** 현재 사용자 좋아요 여부 */
	private Boolean likedByCurrentUser;

	/** 생성 시각 */
	private LocalDateTime createdAt;

	/** 수정 시각 */
	private LocalDateTime updatedAt;

	/**
	 * 엔티티를 DTO로 변환합니다.
	 *
	 * @param entity 원본 게시글 엔티티
	 * @return 변환된 DTO
	 */
	public static PhotoBoardPostDto fromEntity(PhotoBoardPost entity){
		return fromEntity(entity, false);
	}

	/**
	 * 현재 사용자 좋아요 여부를 포함해 엔티티를 DTO로 변환합니다.
	 *
	 * @param entity 원본 게시글 엔티티
	 * @param likedByCurrentUser 현재 사용자 좋아요 여부
	 * @return 변환된 DTO
	 */
	public static PhotoBoardPostDto fromEntity(PhotoBoardPost entity, boolean likedByCurrentUser){
		String authorNickname = null;
		String authorProfileImage = null;

		if(entity.getUser() != null){
			// 연관 User 엔티티가 로드된 경우 작성자 표시 정보를 함께 채웁니다.
			authorNickname = entity.getUser().getNickname();
			authorProfileImage = entity.getUser().getProfileImage();
		}
		List<String> imageUrls = parseImageUrls(entity.getImageUrl());

		return PhotoBoardPostDto.builder()
			.photoPostId(entity.getPhotoPostId())
			.userId(entity.getUserId())
			.authorNickname(authorNickname)
			.authorProfileImage(authorProfileImage)
			.title(entity.getTitle())
			.description(entity.getDescription())
			.imageUrls(imageUrls)
			.tags(parseTags(entity.getTags()))
			.viewCount(entity.getViewCount())
			.likeCount(entity.getLikeCount())
			.likedByCurrentUser(likedByCurrentUser)
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}

	/**
	 * DB 문자열 태그를 API 태그 목록으로 변환합니다.
	 *
	 * @param tags 쉼표 구분 태그 문자열
	 * @return 정규화된 태그 목록
	 */
	private static List<String> parseTags(String tags){
		if(tags == null || tags.trim().isEmpty()){
			return Collections.emptyList();
		}
		return Arrays.stream(tags.split(","))
			.map(PhotoBoardPostDto::normalizeTag)
			.filter(tag -> !tag.isEmpty())
			.distinct()
			.collect(Collectors.toList());
	}

	/**
	 * 태그 문자열에서 접두 해시와 공백을 제거합니다.
	 *
	 * @param tag 원본 태그
	 * @return 정규화된 태그
	 */
	private static String normalizeTag(String tag){
		if(tag == null){
			return "";
		}
		return tag.trim().replaceFirst("^#+", "").trim();
	}

	/**
	 * 줄바꿈으로 저장된 이미지 URL 문자열을 목록으로 변환합니다.
	 *
	 * @param storedImageUrls DB 저장 문자열
	 * @return 중복 제거된 이미지 URL 목록
	 */
	private static List<String> parseImageUrls(String storedImageUrls){
		if(storedImageUrls == null || storedImageUrls.isBlank()){
			return Collections.emptyList();
		}
		return Arrays.stream(storedImageUrls.split("\\R"))
			.map(String::trim)
			.filter(value -> !value.isEmpty())
			.distinct()
			.collect(Collectors.toList());
	}
}

