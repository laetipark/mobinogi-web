import apiService from "./api";
import type {
	ApiResponse,
	GuildBoardCategory,
	GuildBoardCategoryListResponse,
	GuildBoardCategoryResponse,
	GuildBoardPost,
	GuildBoardPostListResponse,
	GuildBoardPostResponse,
	GuildDashboard,
	GuildDashboardResponse,
	GuildGalleryImage,
	GuildGalleryImageListResponse,
	GuildGalleryImageResponse,
	GuildInfo,
	GuildMember,
	GuildMemberRankRefreshResponse,
	GuildMemberRankRefreshStatus,
	GuildMemberRankRefreshStatusResponse,
	GuildMemberRankRefreshSummary,
	GuildMemberRankRefreshTarget,
	GuildMemberResponse,
	GuildResponse,
	GuildRole
} from "@/types";

/**
 * Guild management API base path.
 */
const GUILD_API_BASE = "/guild/management";

/**
 * Guild-scoped resource API base path.
 */
const GUILD_RESOURCE_API_BASE = `${GUILD_API_BASE}/guilds`;

/**
 * Builds guild resource path under `/guilds/{guildId}`.
 *
 * @param guildId guild ID
 * @param resource child resource path
 * @returns full guild resource API path
 */
const guildResourcePath = (guildId:number, resource:string):string =>
	`${GUILD_RESOURCE_API_BASE}/${guildId}/${resource}`;

/**
 * Builds guild gallery API path.
 *
 * @param guildId guild ID
 * @param imageId optional image ID
 * @returns guild gallery API path
 */
const guildGalleryPath = (guildId:number, imageId?:number):string =>
	imageId == null
		? guildResourcePath(guildId, "gallery")
		: guildResourcePath(guildId, `gallery/${imageId}`);

/**
 * Builds guild board API path.
 *
 * @param guildId guild ID
 * @param postId optional post ID
 * @returns guild board API path
 */
const guildBoardPath = (guildId:number, postId?:number):string =>
	postId == null
		? guildResourcePath(guildId, "board")
		: guildResourcePath(guildId, `board/${postId}`);

/**
 * Builds guild board category API path.
 *
 * @param guildId guild ID
 * @param categoryId optional category ID
 * @returns guild board category API path
 */
const guildBoardCategoriesPath = (guildId:number, categoryId?:number):string =>
	categoryId == null
		? guildResourcePath(guildId, "board/categories")
		: guildResourcePath(guildId, `board/categories/${categoryId}`);

/**
 * Constant guildService.
 */
export const guildService = {
	/**
	 * Fetches guild dashboard data.
	 *
	 * @returns guild dashboard payload
	 */
	getDashboard : async():Promise<GuildDashboard> => {
		const response = await apiService.get<GuildDashboardResponse>(`${GUILD_API_BASE}/dashboard`);
		if(response.success){
			return response.dashboard ?? response.data;
		}
		throw new Error(response.message || "Failed to fetch guild dashboard");
	},

	/**
	 * Submits guild registration request.
	 *
	 * @param guildName guild name
	 * @param serverId server ID
	 * @param description guild description
	 * @returns created guild info
	 */
	registerGuild : async(guildName:string, serverId:number, description?:string):Promise<GuildInfo> => {
		const response = await apiService.post<GuildResponse>(`${GUILD_API_BASE}/register`, {
			guildName,
			serverId,
			description
		});
		if(response.success){
			return response.guild ?? response.data;
		}
		throw new Error(response.message || "Failed to register guild");
	},

	/**
	 * Updates description of current managed guild.
	 *
	 * @param description guild description
	 * @returns updated guild info
	 */
	updateGuildDescription : async(description?:string):Promise<GuildInfo> => {
		const response = await apiService.put<GuildResponse>(`${GUILD_API_BASE}/guild/description`, {
			description
		});
		if(response.success){
			return response.guild ?? response.data;
		}
		throw new Error(response.message || "Failed to update guild description");
	},

	/**
	 * Requests to join a guild.
	 *
	 * @param guildId guild ID
	 * @param memberName member character name
	 * @returns created membership
	 */
	requestJoinGuild : async(guildId:number, memberName:string):Promise<GuildMember> => {
		const response = await apiService.post<GuildMemberResponse>(`${GUILD_API_BASE}/join`, {
			guildId,
			memberName
		});
		if(response.success){
			return response.member ?? response.data;
		}
		throw new Error(response.message || "Failed to request join guild");
	},

	/**
	 * Approves pending guild member.
	 *
	 * @param memberId member ID
	 * @returns updated member
	 */
	approveMember : async(memberId:number):Promise<GuildMember> => {
		const response = await apiService.post<GuildMemberResponse>(`${GUILD_API_BASE}/members/${memberId}/approve`);
		if(response.success){
			return response.member ?? response.data;
		}
		throw new Error(response.message || "Failed to approve guild member");
	},

	/**
	 * Rejects pending guild member.
	 *
	 * @param memberId member ID
	 * @returns updated member
	 */
	rejectMember : async(memberId:number):Promise<GuildMember> => {
		const response = await apiService.post<GuildMemberResponse>(`${GUILD_API_BASE}/members/${memberId}/reject`);
		if(response.success){
			return response.member ?? response.data;
		}
		throw new Error(response.message || "Failed to reject guild member");
	},

	/**
	 * Updates guild member role.
	 *
	 * @param memberId member ID
	 * @param guildRole role to apply
	 * @returns updated member
	 */
	updateMemberRole : async(memberId:number, guildRole:GuildRole):Promise<GuildMember> => {
		const response = await apiService.put<GuildMemberResponse>(`${GUILD_API_BASE}/members/${memberId}/role`, {
			guildRole
		});
		if(response.success){
			return response.member ?? response.data;
		}
		throw new Error(response.message || "Failed to update guild role");
	},

	/**
	 * Creates guild member manually.
	 *
	 * @param memberName member name
	 * @returns created member
	 */
	createMember : async(memberName:string):Promise<GuildMember> => {
		const response = await apiService.post<GuildMemberResponse>(`${GUILD_API_BASE}/members`, {
			memberName
		});
		if(response.success){
			return response.member ?? response.data;
		}
		throw new Error(response.message || "Failed to create guild member");
	},

	/**
	 * Updates member basic information.
	 *
	 * @param memberId member ID
	 * @param memberName member name
	 * @param serverId server ID
	 * @returns updated member
	 */
	updateMemberInfo : async(memberId:number, memberName:string, serverId?:number):Promise<GuildMember> => {
		const response = await apiService.put<GuildMemberResponse>(`${GUILD_API_BASE}/members/${memberId}`, {
			memberName,
			serverId
		});
		if(response.success){
			return response.member ?? response.data;
		}
		throw new Error(response.message || "Failed to update guild member info");
	},

	/**
	 * Deletes guild member.
	 *
	 * @param memberId member ID
	 */
	deleteMember : async(memberId:number):Promise<void> => {
		const response = await apiService.delete<ApiResponse>(`${GUILD_API_BASE}/members/${memberId}`);
		if(!response.success){
			throw new Error(response.message || "Failed to delete guild member");
		}
	},

	/**
	 * Triggers guild member rank refresh.
	 *
	 * @param members refresh targets
	 * @returns refresh summary
	 */
	refreshMemberRanks : async(members:GuildMemberRankRefreshTarget[]):Promise<GuildMemberRankRefreshSummary> => {
		const response = await apiService.post<GuildMemberRankRefreshResponse>(`${GUILD_API_BASE}/members/refresh-ranks`, {
			members
		});
		if(response.success){
			return response.summary ?? response.data;
		}
		throw new Error(response.message || "Failed to refresh guild member ranks");
	},

	/**
	 * Fetches latest guild member rank refresh status.
	 *
	 * @returns refresh status
	 */
	getRefreshMemberRanksStatus : async():Promise<GuildMemberRankRefreshStatus> => {
		const response = await apiService.get<GuildMemberRankRefreshStatusResponse>(`${GUILD_API_BASE}/members/refresh-ranks/status`);
		if(response.success){
			return response.status ?? response.data;
		}
		throw new Error(response.message || "Failed to fetch guild member rank refresh status");
	},

	/**
	 * Approves guild registration request (admin API).
	 *
	 * @param guildId guild ID
	 * @param reviewNote review note
	 * @param level guild level
	 * @returns approved guild info
	 */
	approveGuild : async(guildId:number, reviewNote?:string, level?:number):Promise<GuildInfo> => {
		const response = await apiService.post<GuildResponse>(`${GUILD_API_BASE}/admin/guilds/${guildId}/approve`, {
			reviewNote,
			level
		});
		if(response.success){
			return response.guild ?? response.data;
		}
		throw new Error(response.message || "Failed to approve guild");
	},

	/**
	 * Updates guild level (admin API).
	 *
	 * @param guildId guild ID
	 * @param level guild level
	 * @returns updated guild info
	 */
	updateGuildLevel : async(guildId:number, level:number):Promise<GuildInfo> => {
		const response = await apiService.put<GuildResponse>(`${GUILD_API_BASE}/admin/guilds/${guildId}/level`, {
			level
		});
		if(response.success){
			return response.guild ?? response.data;
		}
		throw new Error(response.message || "Failed to update guild level");
	},

	/**
	 * Rejects guild registration request (admin API).
	 *
	 * @param guildId guild ID
	 * @param reviewNote review note
	 * @returns rejected guild info
	 */
	rejectGuild : async(guildId:number, reviewNote?:string):Promise<GuildInfo> => {
		const response = await apiService.post<GuildResponse>(`${GUILD_API_BASE}/admin/guilds/${guildId}/reject`, {
			reviewNote
		});
		if(response.success){
			return response.guild ?? response.data;
		}
		throw new Error(response.message || "Failed to reject guild");
	},

	/**
	 * Fetches guild gallery items.
	 *
	 * @param guildId guild ID
	 * @param options query options
	 * @returns gallery image list
	 */
	getGuildGallery : async(
		guildId:number,
		options?:{limit?:number}
	):Promise<GuildGalleryImage[]> => {
		const limit = options?.limit;
		// Pass limit only when valid.
		const params = typeof limit === "number" && limit > 0 ? {limit} : undefined;
		const response = await apiService.get<GuildGalleryImageListResponse>(guildGalleryPath(guildId), params);
		if(response.success){
			return response.gallery ?? response.data ?? [];
		}
		throw new Error(response.message || "Failed to fetch guild gallery");
	},

	/**
	 * Creates guild gallery image item.
	 *
	 * @param guildId guild ID
	 * @param imageUrls image URL list
	 * @param title title
	 * @param description description
	 * @param tags comma-separated tags
	 * @returns created gallery item
	 */
	createGuildGalleryImage : async(
		guildId:number,
		imageUrls:string[],
		title?:string,
		description?:string,
		tags?:string
	):Promise<GuildGalleryImage> => {
		const response = await apiService.post<GuildGalleryImageResponse>(guildGalleryPath(guildId), {
			imageUrls,
			title,
			description,
			tags
		});
		if(response.success){
			return response.image ?? response.data;
		}
		throw new Error(response.message || "Failed to create guild gallery image");
	},

	/**
	 * Deletes guild gallery image item.
	 *
	 * @param guildId guild ID
	 * @param imageId image ID
	 */
	deleteGuildGalleryImage : async(guildId:number, imageId:number):Promise<void> => {
		const response = await apiService.delete<ApiResponse>(guildGalleryPath(guildId, imageId));
		if(!response.success){
			throw new Error(response.message || "Failed to delete guild gallery image");
		}
	},

	/**
	 * Updates guild gallery image item.
	 *
	 * @param guildId guild ID
	 * @param imageId image ID
	 * @param imageUrls image URL list
	 * @param title title
	 * @param description description
	 * @param tags comma-separated tags
	 * @returns updated gallery item
	 */
	updateGuildGalleryImage : async(
		guildId:number,
		imageId:number,
		imageUrls:string[],
		title?:string,
		description?:string,
		tags?:string
	):Promise<GuildGalleryImage> => {
		const response = await apiService.put<GuildGalleryImageResponse>(guildGalleryPath(guildId, imageId), {
			imageUrls,
			title,
			description,
			tags
		});
		if(response.success){
			return response.image ?? response.data;
		}
		throw new Error(response.message || "Failed to update guild gallery image");
	},

	/**
	 * Toggles guild gallery image like state.
	 *
	 * @param guildId guild ID
	 * @param imageId image ID
	 * @returns updated gallery item
	 */
	toggleGuildGalleryImageLike : async(guildId:number, imageId:number):Promise<GuildGalleryImage> => {
		const response = await apiService.post<GuildGalleryImageResponse>(
			`${guildGalleryPath(guildId, imageId)}/like`
		);
		if(response.success){
			return response.image ?? response.data;
		}
		throw new Error(response.message || "Failed to toggle guild gallery image like");
	},

	/**
	 * Fetches guild board post list.
	 *
	 * @param guildId guild ID
	 * @param options query options
	 * @returns board post list
	 */
	getGuildBoardPosts : async(
		guildId:number,
		options?:{limit?:number}
	):Promise<GuildBoardPost[]> => {
		const limit = options?.limit;
		// Pass limit only when valid.
		const params = typeof limit === "number" && limit > 0 ? {limit} : undefined;
		const response = await apiService.get<GuildBoardPostListResponse>(guildBoardPath(guildId), params);
		if(response.success){
			return response.posts ?? response.data ?? [];
		}
		throw new Error(response.message || "Failed to fetch guild board posts");
	},

	/**
	 * Creates guild board post.
	 *
	 * @param guildId guild ID
	 * @param title title
	 * @param content content
	 * @param categoryId category ID
	 * @returns created post
	 */
	createGuildBoardPost : async(guildId:number, title:string, content:string, categoryId?:number):Promise<GuildBoardPost> => {
		const response = await apiService.post<GuildBoardPostResponse>(guildBoardPath(guildId), {
			categoryId,
			title,
			content
		});
		if(response.success){
			return response.post ?? response.data;
		}
		throw new Error(response.message || "Failed to create guild board post");
	},

	/**
	 * Deletes guild board post.
	 *
	 * @param guildId guild ID
	 * @param postId post ID
	 */
	deleteGuildBoardPost : async(guildId:number, postId:number):Promise<void> => {
		const response = await apiService.delete<ApiResponse>(guildBoardPath(guildId, postId));
		if(!response.success){
			throw new Error(response.message || "Failed to delete guild board post");
		}
	},

	/**
	 * Fetches guild board categories.
	 *
	 * @param guildId guild ID
	 * @returns category list
	 */
	getGuildBoardCategories : async(guildId:number):Promise<GuildBoardCategory[]> => {
		const response = await apiService.get<GuildBoardCategoryListResponse>(guildBoardCategoriesPath(guildId));
		if(response.success){
			return response.categories ?? response.data ?? [];
		}
		throw new Error(response.message || "Failed to fetch guild board categories");
	},

	/**
	 * Creates guild board category.
	 *
	 * @param guildId guild ID
	 * @param name category name
	 * @param sortOrder category sort order
	 * @returns created category
	 */
	createGuildBoardCategory : async(guildId:number, name:string, sortOrder?:number):Promise<GuildBoardCategory> => {
		const response = await apiService.post<GuildBoardCategoryResponse>(guildBoardCategoriesPath(guildId), {
			name,
			sortOrder
		});
		if(response.success){
			return response.category ?? response.data;
		}
		throw new Error(response.message || "Failed to create guild board category");
	},

	/**
	 * Deletes guild board category.
	 *
	 * @param guildId guild ID
	 * @param categoryId category ID
	 */
	deleteGuildBoardCategory : async(guildId:number, categoryId:number):Promise<void> => {
		const response = await apiService.delete<ApiResponse>(guildBoardCategoriesPath(guildId, categoryId));
		if(!response.success){
			throw new Error(response.message || "Failed to delete guild board category");
		}
	},

	/**
	 * Checks authentication by dashboard endpoint.
	 *
	 * @returns `true` when authenticated
	 */
	pingAuth : async():Promise<boolean> => {
		const response = await apiService.get<ApiResponse>(`${GUILD_API_BASE}/dashboard`);
		return !!response.success;
	}
};

export default guildService;
