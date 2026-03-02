package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.guild.UserGuild;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * User guild DTO.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGuildDto{

	/** Guild ID. */
	private Long guildId;

	/** Guild name. */
	private String guildName;

	/** Guild description. */
	private String description;

	/** Server ID. */
	private Integer serverId;

	/** Guild level. */
	private Integer level;

	/** Moderation status. */
	private String status;

	/** Owner user ID. */
	private Long ownerUserId;

	/** Owner nickname. */
	private String ownerNickname;

	/** Master member character name. */
	private String masterMemberName;

	/** Reviewer user ID. */
	private Long reviewedByUserId;

	/** Reviewed timestamp. */
	private LocalDateTime reviewedAt;

	/** Review note text. */
	private String reviewNote;

	/** Created timestamp. */
	private LocalDateTime createdAt;

	/** Updated timestamp. */
	private LocalDateTime updatedAt;

	/**
	 * Converts guild entity to DTO.
	 *
	 * @param entity guild entity
	 * @return DTO instance
	 */
	public static UserGuildDto fromEntity(UserGuild entity){
		return UserGuildDto.builder()
			.guildId(entity.getGuildId())
			.guildName(entity.getGuildName())
			.description(entity.getDescription())
			.serverId(entity.getServerId())
			.level(entity.getLevel())
			.status(entity.getStatus())
			.ownerUserId(entity.getOwner() != null ? entity.getOwner().getUserId() : null)
			.ownerNickname(entity.getOwner() != null ? entity.getOwner().getNickname() : null)
			.reviewedByUserId(entity.getReviewedBy() != null ? entity.getReviewedBy().getUserId() : null)
			.reviewedAt(entity.getReviewedAt())
			.reviewNote(entity.getReviewNote())
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}
}
