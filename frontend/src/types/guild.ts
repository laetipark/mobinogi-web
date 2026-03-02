import type {ApiResponse} from "./common";

export type GuildStatus = "PENDING" | "APPROVED" | "REJECTED";
export type GuildMemberStatus = "PENDING" | "APPROVED" | "REJECTED";
export type GuildRole = 0 | 1 | 2;

export interface GuildInfo{
	guildId:number;
	guildName:string;
	description?:string | null;
	serverId?:number | null;
	status:GuildStatus;
	ownerUserId:number;
	ownerNickname?:string | null;
	reviewedByUserId?:number | null;
	reviewedAt?:string | null;
	reviewNote?:string | null;
	createdAt:string;
	updatedAt:string;
}

export interface GuildMember{
	id:number;
	guildId:number;
	guildName:string;
	userId?:number | null;
	memberName:string;
	serverId?:number | null;
	guildRole:GuildRole;
	memberStatus:GuildMemberStatus;
	approvedByUserId?:number | null;
	approvedAt?:string | null;
	createdAt:string;
	updatedAt:string;
	userPower?:number | null;
	userVitality?:number | null;
	userAttractiveness?:number | null;
	rankUpdatedAt?:string | null;
}

export interface GuildDashboard{
	isAdmin:boolean;
	myApprovedGuild?:GuildInfo | null;
	myMembership?:GuildMember | null;
	canManageMembers:boolean;
	guildMembers:GuildMember[];
	pendingGuildMembers:GuildMember[];
	ownedGuildRequests:GuildInfo[];
	myPendingJoinRequests:GuildMember[];
	approvedGuilds:GuildInfo[];
	adminPendingGuilds:GuildInfo[];
}

export interface GuildDashboardResponse extends ApiResponse{
	dashboard:GuildDashboard;
}

export interface GuildResponse extends ApiResponse{
	guild:GuildInfo;
}

export interface GuildMemberResponse extends ApiResponse{
	member:GuildMember;
}

export interface GuildMemberRankRefreshSummary{
	guildId:number;
	totalMemberCount:number;
	requestedCount:number;
	successCount:number;
	failedCount:number;
	skippedCount:number;
	refreshedAt:string;
}

export interface GuildMemberRankRefreshResponse extends ApiResponse{
	summary:GuildMemberRankRefreshSummary;
}

export interface GuildMemberRankRefreshTarget{
	memberName:string;
	serverId:number;
}

export interface GuildMemberRankRefreshStatus{
	guildId:number;
	refreshing:boolean;
	status:"IDLE" | "RUNNING" | "COMPLETED" | "FAILED" | string;
	requestedByUserId?:number | null;
	totalMemberCount:number;
	requestedCount:number;
	successCount:number;
	failedCount:number;
	skippedCount:number;
	startedAt?:string | null;
	finishedAt?:string | null;
	updatedAt?:string | null;
	message?:string | null;
}

export interface GuildMemberRankRefreshStatusResponse extends ApiResponse{
	status:GuildMemberRankRefreshStatus;
}
