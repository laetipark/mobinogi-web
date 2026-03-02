package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.guild.UserGuildBoardPost;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
/**
 * 길드 게시판 게시글 응답 DTO입니다.
 */
public class GuildBoardPostDto{

	/** 게시글 ID */
	private Long id;

	/** 길드 ID */
	private Long guildId;

	/** 작성자 사용자 ID */
	private Long authorUserId;

	/** 작성자 닉네임 */
	private String authorNickname;

	/** 작성자 프로필 이미지 URL */
	private String authorProfileImage;

	/** 카테고리 ID */
	private Long categoryId;

	/** 카테고리명 */
	private String categoryName;

	/** 게시글 제목 */
	private String title;

	/** 게시글 본문 */
	private String content;

	/** 생성 시각 */
	private LocalDateTime createdAt;

	/** 수정 시각 */
	private LocalDateTime updatedAt;

	/**
	 * 엔티티를 응답 DTO로 변환합니다.
	 *
	 * @param entity 원본 게시글 엔티티
	 * @return 변환된 응답 DTO
	 */
	public static GuildBoardPostDto fromEntity(UserGuildBoardPost entity){
		var author = entity.getAuthor();
		var category = entity.getCategory();
		return GuildBoardPostDto.builder()
			.id(entity.getId())
			.guildId(entity.getGuild() != null ? entity.getGuild().getGuildId() : null)
			.authorUserId(author != null ? author.getUserId() : entity.getAuthorUserId())
			.authorNickname(author != null ? author.getNickname() : null)
			.authorProfileImage(author != null ? author.getProfileImage() : null)
			.categoryId(category != null ? category.getId() : entity.getCategoryId())
			.categoryName(category != null ? category.getName() : null)
			.title(entity.getTitle())
			.content(entity.getContent())
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}
}
