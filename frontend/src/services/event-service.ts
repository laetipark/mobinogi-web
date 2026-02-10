import apiService from "./api";
import type {ApiResponse, GameEvent} from "../types";

export const eventService = {
	getActiveEvents : async():Promise<GameEvent[]> => {
		const response = await apiService.get<ApiResponse & {data:GameEvent[]}>("/events");
		if(response.success){
			return response.data;
		}
		throw new Error(response.message || "Failed to fetch events");
	}
};

export default eventService;
