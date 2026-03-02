package com.example.mobinogi.dto.user;

import lombok.Data;

import java.util.List;

@Data
public class GuildMemberRankRefreshRequest{
	private List<GuildMemberRankRefreshTargetRequest> members;
}
