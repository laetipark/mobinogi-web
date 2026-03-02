package com.example.mobinogi.dto.user;

import lombok.Data;

@Data
public class GuildJoinRequest{
	private Long guildId;
	private String memberName;
}
