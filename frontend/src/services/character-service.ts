import apiService from "./api";
import {UserCharacter, UserCharacterRequest} from "../types";

interface CharacterListResponse{
	success:boolean;
	characters:UserCharacter[];
	message?:string;
}

interface CharacterResponse{
	success:boolean;
	character:UserCharacter;
	message?:string;
}

interface DeleteResponse{
	success:boolean;
	message:string;
}

export const characterService = {
	getMyCharacters : async():Promise<UserCharacter[]> => {
		const response = await apiService.get<CharacterListResponse>("/user/characters");
		if(response.success){
			return response.characters;
		}
		throw new Error(response.message || "Failed to fetch characters");
	},

	createCharacter : async(request:UserCharacterRequest):Promise<UserCharacter> => {
		const response = await apiService.post<CharacterResponse>("/user/characters", request);
		if(response.success){
			return response.character;
		}
		throw new Error(response.message || "Failed to create character");
	},

	updateCharacter : async(characterId:number, request:UserCharacterRequest):Promise<UserCharacter> => {
		const response = await apiService.put<CharacterResponse>(`/user/characters/${characterId}`, request);
		if(response.success){
			return response.character;
		}
		throw new Error(response.message || "Failed to update character");
	},

	deleteCharacter : async(characterId:number):Promise<void> => {
		const response = await apiService.delete<DeleteResponse>(`/user/characters/${characterId}`);
		if(!response.success){
			throw new Error(response.message || "Failed to delete character");
		}
	}
};

export default characterService;
