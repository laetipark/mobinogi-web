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
public class UserGuildDto {

	private Long id;
	private String memberName;
	private String category;
	private String jobClass;
	private Integer contributionStart;
	private Integer contributionMiddle1;
	private Integer contributionMiddle2;
	private Integer contributionMiddle3;
	private Integer contributionFinish;
	private Integer contributionChanged;
	private String subCharacter;
	private String textInfo;
	private String notionPageId;
	private LocalDateTime lastEditedTime;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;

	public static UserGuildDto from(UserGuild entity) {
		return UserGuildDto.builder()
			.id(entity.getId())
			.memberName(entity.getMemberName())
			.category(entity.getClassType())
			.jobClass(entity.getClassName())
			.contributionStart(entity.getContributionStart())
			.contributionMiddle1(entity.getContributionMiddle1())
			.contributionMiddle2(entity.getContributionMiddle2())
			.contributionMiddle3(entity.getContributionMiddle3())
			.contributionFinish(entity.getContributionFinish())
			.contributionChanged(entity.getContributionChanged())
			.subCharacter(entity.getSubCharacter())
			.textInfo(entity.getTextInfo())
			.notionPageId(entity.getNotionPageId())
			.lastEditedTime(entity.getLastEditedTime())
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}
}
