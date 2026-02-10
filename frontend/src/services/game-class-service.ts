import apiService from "./api";

export interface GameClassItem{
	classId:number;
	classCode:string;
	className:string;
	isApprentice:boolean;
}

interface GameClassResponse{
	success:boolean;
	classes:GameClassItem[];
	message?:string;
}

let cachedClasses:GameClassItem[] | null = null;

export const gameClassService = {
	getClasses : async():Promise<GameClassItem[]> => {
		if(cachedClasses){
			return cachedClasses;
		}

		const response = await apiService.get<GameClassResponse>("/classes");
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
