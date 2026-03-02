package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.guild.UserGuildMember;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Guild member list row DTO.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGuildMemberListDto{

	/** Member row ID. */
	private Long id;

	/** Member name. */
	private String memberName;

	/** Guild name. */
	private String guildName;

	/** Class category. */
	private String category;

	/** Job class name. */
	private String jobClass;

	/** Contribution start value. */
	private Integer contributionStart;

	/** Contribution middle-1 value. */
	private Integer contributionMiddle1;

	/** Contribution middle-2 value. */
	private Integer contributionMiddle2;

	/** Contribution middle-3 value. */
	private Integer contributionMiddle3;

	/** Contribution finish value. */
	private Integer contributionFinish;

	/** Contribution delta. */
	private Integer contributionChanged;

	/** Guild role code. */
	private Integer guildRole;

	/** Sub-character text. */
	private String subCharacter;

	/** Created timestamp. */
	private LocalDateTime createdAt;

	/** Updated timestamp. */
	private LocalDateTime updatedAt;

	/**
	 * Converts entity to list-row DTO.
	 *
	 * @param entity guild member entity
	 * @return DTO instance
	 */
	public static UserGuildMemberListDto from(UserGuildMember entity){
		return UserGuildMemberListDto.builder()
			.id(entity.getId())
			.memberName(entity.getMemberName())
			.guildName(entity.getGuildName())
			.category(entity.getClassType())
			.jobClass(entity.getClassName())
			.contributionStart(entity.getContributionStart())
			.contributionMiddle1(entity.getContributionMiddle1())
			.contributionMiddle2(entity.getContributionMiddle2())
			.contributionMiddle3(entity.getContributionMiddle3())
			.contributionFinish(entity.getContributionFinish())
			.contributionChanged(entity.getContributionChanged())
			.guildRole(entity.getGuildRole())
			.subCharacter(entity.getSubCharacter())
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}
}
