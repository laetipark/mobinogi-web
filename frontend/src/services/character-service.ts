import apiService from "./api";
import type {ApiResponse, UserCharacter, UserCharacterRequest} from "../types";

export const characterService = {
	getMyCharacters : async():Promise<UserCharacter[]> => {
		const response = await apiService.get<ApiResponse & {characters:UserCharacter[]}>("/user/characters");
		if(response.success){
			return response.characters;
		}
		throw new Error(response.message || "Failed to fetch characters");
	},

	createCharacter : async(request:UserCharacterRequest):Promise<UserCharacter> => {
		const response = await apiService.post<ApiResponse & {character:UserCharacter}>("/user/characters", request);
		if(response.success){
			return response.character;
		}
		throw new Error(response.message || "Failed to create character");
	},

	updateCharacter : async(characterId:number, request:UserCharacterRequest):Promise<UserCharacter> => {
		const response = await apiService.put<ApiResponse & {character:UserCharacter}>(`/user/characters/${characterId}`, request);
		if(response.success){
			return response.character;
		}
		throw new Error(response.message || "Failed to update character");
	},

	deleteCharacter : async(characterId:number):Promise<void> => {
		const response = await apiService.delete<ApiResponse>(`/user/characters/${characterId}`);
		if(!response.success){
			throw new Error(response.message || "Failed to delete character");
		}
	},

	reorderCharacters : async(characterIds:number[]):Promise<void> => {
		const response = await apiService.put<ApiResponse>("/user/characters/reorder", {characterIds});
		if(!response.success){
			throw new Error(response.message || "Failed to reorder characters");
		}
	},

	fetchRank : async(characterName:string, serverId:number):Promise<ApiResponse & {userPower:number | null; userVitality:number | null; userAttractiveness:number | null}> => {
		const response = await apiService.get<ApiResponse & {userPower:number | null; userVitality:number | null; userAttractiveness:number | null}>(`/user/characters/rank?characterName=${encodeURIComponent(characterName)}&serverId=${serverId}`);
		if(response.success){
			return response;
		}
		throw new Error(response.message || "Failed to fetch rank");
	}
};

export default characterService;
