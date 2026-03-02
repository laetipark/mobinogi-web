package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.guild.UserGuildBoardCategory;
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
 * 길드 게시판 카테고리 응답 DTO입니다.
 */
public class GuildBoardCategoryDto{

	/** 카테고리 ID */
	private Long id;

	/** 길드 ID */
	private Long guildId;

	/** 카테고리명 */
	private String name;

	/** 정렬 순서 */
	private Integer sortOrder;

	/** 생성자 사용자 ID */
	private Long createdByUserId;

	/** 생성자 닉네임 */
	private String createdByNickname;

	/** 생성 시각 */
	private LocalDateTime createdAt;

	/** 수정 시각 */
	private LocalDateTime updatedAt;

	/**
	 * 엔티티를 응답 DTO로 변환합니다.
	 *
	 * @param entity 원본 카테고리 엔티티
	 * @return 변환된 응답 DTO
	 */
	public static GuildBoardCategoryDto fromEntity(UserGuildBoardCategory entity){
		var createdBy = entity.getCreatedBy();
		return GuildBoardCategoryDto.builder()
			.id(entity.getId())
			.guildId(entity.getGuild() != null ? entity.getGuild().getGuildId() : null)
			.name(entity.getName())
			.sortOrder(entity.getSortOrder())
			.createdByUserId(createdBy != null ? createdBy.getUserId() : entity.getCreatedByUserId())
			.createdByNickname(createdBy != null ? createdBy.getNickname() : null)
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}
}
