package com.example.mobinogi.dto.user;

import lombok.Data;

@Data
public class GuildRegisterRequest{
	private String guildName;
	private String description;
	private Integer serverId;
}
