package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.UserGuild;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGuildDto{

	private Long guildId;
	private String guildName;
	private String description;
	private Integer serverId;
	private String status;
	private Long ownerUserId;
	private String ownerNickname;
	private Long reviewedByUserId;
	private LocalDateTime reviewedAt;
	private String reviewNote;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;

	public static UserGuildDto fromEntity(UserGuild entity){
		return UserGuildDto.builder()
			.guildId(entity.getGuildId())
			.guildName(entity.getGuildName())
			.description(entity.getDescription())
			.serverId(entity.getServerId())
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
