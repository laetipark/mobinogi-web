package com.example.mobinogi.dto.user;

import lombok.Data;

@Data
public class GuildMemberRankRefreshTargetRequest{
	private String memberName;
	private Integer serverId;
}
