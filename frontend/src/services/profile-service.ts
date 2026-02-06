import apiService from "./api";
import {User} from "../types";

interface ProfileUpdateRequest{
	nickname?:string;
	profileImage?:string;
}

interface ProfileResponse{
	success:boolean;
	user:User;
	message?:string;
}

export const profileService = {
	updateProfile: async(data:ProfileUpdateRequest):Promise<User> => {
		const response = await apiService.put<ProfileResponse>("/auth/profile", data);
		if(response.success){
			return response.user;
		}
		throw new Error(response.message || "프로필 업데이트에 실패했습니다.");
	}
};

export default profileService;
