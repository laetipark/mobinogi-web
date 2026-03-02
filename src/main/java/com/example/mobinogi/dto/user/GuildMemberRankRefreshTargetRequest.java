package com.example.mobinogi.dto.user;

import lombok.Data;

@Data
public class GuildMemberRankRefreshTargetRequest{
	/**
	 * Field memberName.
	 */
	private String memberName;
	/**
	 * Field serverId.
	 */
	private Integer serverId;
}
