package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.guild.UserGuildMember;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * User guild member DTO.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGuildMemberDto{

	/** Member row ID. */
	private Long id;

	/** Guild ID. */
	private Long guildId;

	/** Guild name. */
	private String guildName;

	/** User ID. */
	private Long userId;

	/** Character/member name. */
	private String memberName;

	/** Server ID. */
	private Integer serverId;

	/** Guild role code. */
	private Integer guildRole;

	/** Membership status. */
	private String memberStatus;

	/** Approver user ID. */
	private Long approvedByUserId;

	/** Approved timestamp. */
	private LocalDateTime approvedAt;

	/** Created timestamp. */
	private LocalDateTime createdAt;

	/** Updated timestamp. */
	private LocalDateTime updatedAt;

	/** Power stat snapshot. */
	private Integer userPower;

	/** Vitality stat snapshot. */
	private Integer userVitality;

	/** Attractiveness stat snapshot. */
	private Integer userAttractiveness;

	/** Last rank-sync timestamp. */
	private LocalDateTime rankUpdatedAt;

	/**
	 * Converts entity to DTO.
	 *
	 * @param entity member entity
	 * @return DTO instance
	 */
	public static UserGuildMemberDto fromEntity(UserGuildMember entity){
		return UserGuildMemberDto.builder()
			.id(entity.getId())
			.guildId(entity.getGuild() != null ? entity.getGuild().getGuildId() : null)
			.guildName(entity.getGuild() != null ? entity.getGuild().getGuildName() : entity.getGuildName())
			.userId(entity.getUser() != null ? entity.getUser().getUserId() : null)
			.memberName(entity.getMemberName())
			.serverId(entity.getServerId())
			.guildRole(entity.getGuildRole())
			.memberStatus(entity.getMemberStatus())
			.approvedByUserId(entity.getApprovedByUserId())
			.approvedAt(entity.getApprovedAt())
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}
}
