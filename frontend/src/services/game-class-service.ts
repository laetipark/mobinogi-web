import apiService from "./api";
import type {ApiResponse, GameClassItem} from "../types";
import {normalizeSelectableClasses} from "@/utils";

let cachedClasses:GameClassItem[] | null = null;

/**
 * Constant gameClassService.
 */
export const gameClassService = {
	getClasses : async():Promise<GameClassItem[]> => {
		if(cachedClasses){
			return cachedClasses;
		}

		const response = await apiService.get<ApiResponse & {classes:GameClassItem[]}>("/classes");
		if(response.success){
			cachedClasses = normalizeSelectableClasses(response.classes);
			return cachedClasses;
		}
		throw new Error(response.message || "Failed to fetch classes");
	},

	clearCache : () => {
		cachedClasses = null;
	}
};

export default gameClassService;
