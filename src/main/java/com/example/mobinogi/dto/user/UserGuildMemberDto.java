package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.UserGuildMember;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGuildMemberDto{

	private Long id;
	private Long guildId;
	private String guildName;
	private Long userId;
	private String memberName;
	private Integer serverId;
	private Integer guildRole;
	private String memberStatus;
	private Long approvedByUserId;
	private LocalDateTime approvedAt;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
	private Integer userPower;
	private Integer userVitality;
	private Integer userAttractiveness;
	private LocalDateTime rankUpdatedAt;

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
