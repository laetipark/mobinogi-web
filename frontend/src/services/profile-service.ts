import apiService from "./api";
import type {ApiResponse, User, ProfileUpdateRequest} from "../types";

/**
 * Constant profileService.
 */
export const profileService = {
	updateProfile: async(data:ProfileUpdateRequest):Promise<User> => {
		const response = await apiService.put<ApiResponse & {user:User}>("/auth/profile", data);
		if(response.success){
			return response.user;
		}
		throw new Error(response.message || "프로필 업데이트에 실패했습니다.");
	}
};

export default profileService;
