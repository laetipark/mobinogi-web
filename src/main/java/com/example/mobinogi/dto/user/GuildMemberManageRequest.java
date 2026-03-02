package com.example.mobinogi.dto.user;

import lombok.Data;

@Data
public class GuildMemberManageRequest{
	/**
	 * Field memberName.
	 */
	private String memberName;
	/**
	 * Field serverId.
	 */
	private Integer serverId;
}
