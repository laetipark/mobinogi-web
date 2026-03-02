package com.example.mobinogi.dto.user;

import lombok.Data;

@Data
public class GuildJoinRequest{
	/**
	 * Field guildId.
	 */
	private Long guildId;
	/**
	 * Field memberName.
	 */
	private String memberName;
}
