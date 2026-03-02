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

	/**
	 * Field isAdmin.
	 */
	private boolean isAdmin;
	/**
	 * Field myApprovedGuild.
	 */
	private UserGuildDto myApprovedGuild;
	/**
	 * Field myMembership.
	 */
	private UserGuildMemberDto myMembership;
	/**
	 * Field canManageMembers.
	 */
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
