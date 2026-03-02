package com.example.mobinogi.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuildDashboardDto{

	private boolean isAdmin;
	private UserGuildDto myApprovedGuild;
	private UserGuildMemberDto myMembership;
	private boolean canManageMembers;
	@Builder.Default
	private List<UserGuildMemberDto> guildMembers = new ArrayList<>();
	@Builder.Default
	private List<UserGuildMemberDto> pendingGuildMembers = new ArrayList<>();
	@Builder.Default
	private List<UserGuildDto> ownedGuildRequests = new ArrayList<>();
	@Builder.Default
	private List<UserGuildMemberDto> myPendingJoinRequests = new ArrayList<>();
	@Builder.Default
	private List<UserGuildDto> approvedGuilds = new ArrayList<>();
	@Builder.Default
	private List<UserGuildDto> adminPendingGuilds = new ArrayList<>();
}
