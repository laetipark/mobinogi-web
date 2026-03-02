import apiService from "./api";
import type {
	ApiResponse,
	GuildDashboard,
	GuildDashboardResponse,
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

export const guildService = {
	getDashboard : async():Promise<GuildDashboard> => {
		const response = await apiService.get<GuildDashboardResponse>("/guild/management/dashboard");
		if(response.success){
			return response.dashboard;
		}
		throw new Error(response.message || "Failed to fetch guild dashboard");
	},

	registerGuild : async(guildName:string, serverId:number, description?:string):Promise<GuildInfo> => {
		const response = await apiService.post<GuildResponse>("/guild/management/register", {
			guildName,
			serverId,
			description
		});
		if(response.success){
			return response.guild;
		}
		throw new Error(response.message || "Failed to register guild");
	},

	updateGuildDescription : async(description?:string):Promise<GuildInfo> => {
		const response = await apiService.put<GuildResponse>("/guild/management/guild/description", {
			description
		});
		if(response.success){
			return response.guild;
		}
		throw new Error(response.message || "Failed to update guild description");
	},

	requestJoinGuild : async(guildId:number, memberName:string):Promise<GuildMember> => {
		const response = await apiService.post<GuildMemberResponse>("/guild/management/join", {
			guildId,
			memberName
		});
		if(response.success){
			return response.member;
		}
		throw new Error(response.message || "Failed to request join guild");
	},

	approveMember : async(memberId:number):Promise<GuildMember> => {
		const response = await apiService.post<GuildMemberResponse>(`/guild/management/members/${memberId}/approve`);
		if(response.success){
			return response.member;
		}
		throw new Error(response.message || "Failed to approve guild member");
	},

	rejectMember : async(memberId:number):Promise<GuildMember> => {
		const response = await apiService.post<GuildMemberResponse>(`/guild/management/members/${memberId}/reject`);
		if(response.success){
			return response.member;
		}
		throw new Error(response.message || "Failed to reject guild member");
	},

	updateMemberRole : async(memberId:number, guildRole:GuildRole):Promise<GuildMember> => {
		const response = await apiService.put<GuildMemberResponse>(`/guild/management/members/${memberId}/role`, {
			guildRole
		});
		if(response.success){
			return response.member;
		}
		throw new Error(response.message || "Failed to update guild role");
	},

	createMember : async(memberName:string):Promise<GuildMember> => {
		const response = await apiService.post<GuildMemberResponse>("/guild/management/members", {
			memberName
		});
		if(response.success){
			return response.member;
		}
		throw new Error(response.message || "Failed to create guild member");
	},

	updateMemberInfo : async(memberId:number, memberName:string, serverId?:number):Promise<GuildMember> => {
		const response = await apiService.put<GuildMemberResponse>(`/guild/management/members/${memberId}`, {
			memberName,
			serverId
		});
		if(response.success){
			return response.member;
		}
		throw new Error(response.message || "Failed to update guild member info");
	},

	deleteMember : async(memberId:number):Promise<void> => {
		const response = await apiService.delete<ApiResponse>(`/guild/management/members/${memberId}`);
		if(!response.success){
			throw new Error(response.message || "Failed to delete guild member");
		}
	},

	refreshMemberRanks : async(members:GuildMemberRankRefreshTarget[]):Promise<GuildMemberRankRefreshSummary> => {
		const response = await apiService.post<GuildMemberRankRefreshResponse>("/guild/management/members/refresh-ranks", {
			members
		});
		if(response.success){
			return response.summary;
		}
		throw new Error(response.message || "Failed to refresh guild member ranks");
	},

	getRefreshMemberRanksStatus : async():Promise<GuildMemberRankRefreshStatus> => {
		const response = await apiService.get<GuildMemberRankRefreshStatusResponse>("/guild/management/members/refresh-ranks/status");
		if(response.success){
			return response.status;
		}
		throw new Error(response.message || "Failed to fetch guild member rank refresh status");
	},

	approveGuild : async(guildId:number, reviewNote?:string):Promise<GuildInfo> => {
		const response = await apiService.post<GuildResponse>(`/guild/management/admin/guilds/${guildId}/approve`, {
			reviewNote
		});
		if(response.success){
			return response.guild;
		}
		throw new Error(response.message || "Failed to approve guild");
	},

	rejectGuild : async(guildId:number, reviewNote?:string):Promise<GuildInfo> => {
		const response = await apiService.post<GuildResponse>(`/guild/management/admin/guilds/${guildId}/reject`, {
			reviewNote
		});
		if(response.success){
			return response.guild;
		}
		throw new Error(response.message || "Failed to reject guild");
	},

	pingAuth : async():Promise<boolean> => {
		const response = await apiService.get<ApiResponse>("/guild/management/dashboard");
		return !!response.success;
	}
};

export default guildService;
