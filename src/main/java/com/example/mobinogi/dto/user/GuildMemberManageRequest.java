package com.example.mobinogi.dto.user;

import lombok.Data;

@Data
public class GuildMemberManageRequest{
	private String memberName;
	private Integer serverId;
}
