import apiService from "./api";
import type {ApiResponse, GameNotice, NoticeCategory} from "@/types";

/**
 * Constant noticeService.
 */
export const noticeService = {
	getNotices : async(category?:NoticeCategory):Promise<GameNotice[]> => {
		const response = await apiService.get<ApiResponse & {data:GameNotice[]}>("/notices", category ? {category} : undefined);
		if(response.success){
			return response.data;
		}
		throw new Error(response.message || "Failed to fetch notices");
	}
};

export default noticeService;
