import {apiService} from "./api";

export const discordService = {
	/**
	 * Discord OAuth2 인증 URL 가져오기
	 */
	async getAuthorizeUrl():Promise<string>{
		const response = await apiService.get<{success:boolean; url:string}>("/auth/discord/authorize");
		if(response.success && response.url){
			return response.url;
		}
		throw new Error("Failed to get Discord authorize URL");
	},

	/**
	 * Discord OAuth2 콜백 처리
	 */
	async handleCallback(code:string, token:string):Promise<{success:boolean; message:string; data?:any}>{
		const response = await apiService.post<{success:boolean; message:string; data?:any}>(
			"/auth/discord/callback",
			{code, token}
		);
		return response;
	},

	/**
	 * Discord 계정 연동 해제
	 */
	async unlinkDiscord():Promise<{success:boolean; message:string}>{
		const response = await apiService.delete<{success:boolean; message:string}>("/auth/discord/unlink");
		return response;
	}
};
