package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.guild.UserGuildGalleryImage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
/**
 * 길드 갤러리 이미지 응답 DTO입니다.
 */
public class GuildGalleryImageDto{

	/** 갤러리 이미지 ID */
	private Long id;

	/** 길드 ID */
	private Long guildId;

	/** 업로더 사용자 ID */
	private Long uploaderUserId;

	/** 업로더 닉네임 */
	private String uploaderNickname;

	/** 업로더 프로필 이미지 URL */
	private String uploaderProfileImage;

	/** 이미지 URL 목록 */
	private List<String> imageUrls;

	/** 갤러리 제목 */
	private String title;

	/** 갤러리 설명 */
	private String description;

	/** 태그 목록 */
	private List<String> tags;

	/** 조회수 */
	private Integer viewCount;

	/** 좋아요 수 */
	private Integer likeCount;

	/** 생성 시각 */
	private LocalDateTime createdAt;

	/** 수정 시각 */
	private LocalDateTime updatedAt;

	/**
	 * 엔티티를 API 응답 DTO로 변환합니다.
	 *
	 * @param entity 원본 엔티티
	 * @return 변환된 DTO
	 */
	public static GuildGalleryImageDto fromEntity(UserGuildGalleryImage entity){
		var uploader = entity.getUploader();
		List<String> imageUrls = parseImageUrls(entity.getImageUrl());
		return GuildGalleryImageDto.builder()
			.id(entity.getId())
			.guildId(entity.getGuild() != null ? entity.getGuild().getGuildId() : null)
			.uploaderUserId(uploader != null ? uploader.getUserId() : entity.getUploaderUserId())
			.uploaderNickname(uploader != null ? uploader.getNickname() : null)
			.uploaderProfileImage(uploader != null ? uploader.getProfileImage() : null)
			.imageUrls(imageUrls)
			.title(entity.getTitle())
			.description(entity.getDescription())
			.tags(parseTags(entity.getTags()))
			.viewCount(entity.getViewCount() != null ? entity.getViewCount() : 0)
			.likeCount(entity.getLikeCount() != null ? entity.getLikeCount() : 0)
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}

	/**
	 * 쉼표 구분 태그 문자열을 태그 목록으로 변환합니다.
	 *
	 * @param tags 원본 태그 문자열
	 * @return 정규화된 태그 목록
	 */
	private static List<String> parseTags(String tags){
		if(tags == null || tags.trim().isEmpty()){
			return Collections.emptyList();
		}
		return Arrays.stream(tags.split(","))
			.map(GuildGalleryImageDto::normalizeTag)
			.filter(tag -> !tag.isEmpty())
			.distinct()
			.collect(Collectors.toList());
	}

	/**
	 * 단일 태그 문자열을 정규화합니다.
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
	 * 줄바꿈 구분 이미지 URL 문자열을 목록으로 변환합니다.
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
