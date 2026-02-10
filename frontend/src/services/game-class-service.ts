import apiService from "./api";
import type {ApiResponse, GameClassItem} from "../types";

let cachedClasses:GameClassItem[] | null = null;

export const gameClassService = {
	getClasses : async():Promise<GameClassItem[]> => {
		if(cachedClasses){
			return cachedClasses;
		}

		const response = await apiService.get<ApiResponse & {classes:GameClassItem[]}>("/classes");
		if(response.success){
			cachedClasses = response.classes.filter(cls => !cls.isApprentice);
			return cachedClasses;
		}
		throw new Error(response.message || "Failed to fetch classes");
	},

	clearCache : () => {
		cachedClasses = null;
	}
};

export default gameClassService;
