package com.example.mobinogi.dto.user;

import lombok.Data;

@Data
public class GuildRegisterRequest{
	/**
	 * Field guildName.
	 */
	private String guildName;
	/**
	 * Field description.
	 */
	private String description;
	/**
	 * Field serverId.
	 */
	private Integer serverId;
}
