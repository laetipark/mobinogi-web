import type {ApiResponse} from "./common";

/** Guild moderation status. */
export type GuildStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Guild member approval status. */
export type GuildMemberStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Guild member role (0: member, 1: officer, 2: master). */
export type GuildRole = 0 | 1 | 2;

/** Guild core information DTO. */
export interface GuildInfo{
	guildId:number;
	guildName:string;
	description?:string | null;
	serverId?:number | null;
	level?:number | null;
	status:GuildStatus;
	ownerUserId:number;
	ownerNickname?:string | null;
	masterMemberName?:string | null;
	reviewedByUserId?:number | null;
	reviewedAt?:string | null;
	reviewNote?:string | null;
	createdAt:string;
	updatedAt:string;
}

/** Guild member DTO. */
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

/** Dashboard payload model. */
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

/** Guild dashboard API response. */
export interface GuildDashboardResponse extends ApiResponse{
	dashboard:GuildDashboard;
}

/** Single guild API response. */
export interface GuildResponse extends ApiResponse{
	guild:GuildInfo;
}

/** Single guild member API response. */
export interface GuildMemberResponse extends ApiResponse{
	member:GuildMember;
}

/** Member rank refresh summary model. */
export interface GuildMemberRankRefreshSummary{
	guildId:number;
	totalMemberCount:number;
	requestedCount:number;
	successCount:number;
	failedCount:number;
	skippedCount:number;
	refreshedAt:string;
}

/** Member rank refresh API response. */
export interface GuildMemberRankRefreshResponse extends ApiResponse{
	summary:GuildMemberRankRefreshSummary;
}

/** Member rank refresh target request item. */
export interface GuildMemberRankRefreshTarget{
	memberName:string;
	serverId:number;
}

/** Member rank refresh status model. */
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

/** Member rank refresh status API response. */
export interface GuildMemberRankRefreshStatusResponse extends ApiResponse{
	status:GuildMemberRankRefreshStatus;
}

/** Guild gallery image DTO. */
export interface GuildGalleryImage{
	id:number;
	guildId:number;
	userId?:number | null;
	uploaderUserId?:number | null;
	uploaderNickname?:string | null;
	uploaderProfileImage?:string | null;
	imageUrls:string[];
	title?:string | null;
	description?:string | null;
	tags?:string[] | null;
	viewCount?:number | null;
	likeCount?:number | null;
	createdAt:string;
	updatedAt:string;
}

/** Guild gallery list API response. */
export interface GuildGalleryImageListResponse extends ApiResponse{
	gallery:GuildGalleryImage[];
}

/** Guild gallery single-item API response. */
export interface GuildGalleryImageResponse extends ApiResponse{
	image:GuildGalleryImage;
}

/** Guild board post DTO. */
export interface GuildBoardPost{
	id:number;
	guildId:number;
	authorUserId?:number | null;
	authorNickname?:string | null;
	authorProfileImage?:string | null;
	categoryId?:number | null;
	categoryName?:string | null;
	title:string;
	content:string;
	createdAt:string;
	updatedAt:string;
}

/** Guild board category DTO. */
export interface GuildBoardCategory{
	id:number;
	guildId:number;
	name:string;
	sortOrder?:number | null;
	createdByUserId?:number | null;
	createdByNickname?:string | null;
	createdAt:string;
	updatedAt:string;
}

/** Guild board post list API response. */
export interface GuildBoardPostListResponse extends ApiResponse{
	posts:GuildBoardPost[];
}

/** Guild board single post API response. */
export interface GuildBoardPostResponse extends ApiResponse{
	post:GuildBoardPost;
}

/** Guild board category list API response. */
export interface GuildBoardCategoryListResponse extends ApiResponse{
	categories:GuildBoardCategory[];
}

/** Guild board single category API response. */
export interface GuildBoardCategoryResponse extends ApiResponse{
	category:GuildBoardCategory;
}
