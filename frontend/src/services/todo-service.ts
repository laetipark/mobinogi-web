import apiService from "./api";
import type {ApiResponse, UserTodo, UserTodoBarter, TodoData, GameMonster} from "../types";

export const todoService = {
	getTodos : async():Promise<UserTodo[]> => {
		const response = await apiService.get<ApiResponse & {todos:UserTodo[]}>("/user/todo");
		if(response.success){
			return response.todos;
		}
		throw new Error(response.message || "Failed to fetch todos");
	},

	updateTodo : async(characterId:number, todoData:TodoData):Promise<UserTodo> => {
		const response = await apiService.put<ApiResponse & {todo:UserTodo}>(`/user/todo/${characterId}`, {todoData});
		if(response.success){
			return response.todo;
		}
		throw new Error(response.message || "Failed to update todo");
	},

	getBarterCart : async(characterId:number):Promise<UserTodoBarter[]> => {
		const response = await apiService.get<ApiResponse & {barters:UserTodoBarter[]}>(`/user/todo/barter/${characterId}`);
		if(response.success){
			return response.barters;
		}
		throw new Error(response.message || "Failed to fetch barter cart");
	},

	addBarterItem : async(characterId:number, itemName:string, exchangeItemName:string, npcName:string, regionName:string, exchangeCost:number, barterCycle:string):Promise<UserTodoBarter> => {
		const response = await apiService.post<ApiResponse & {barter:UserTodoBarter}>(`/user/todo/barter/${characterId}`, {itemName, exchangeItemName, npcName, regionName, exchangeCost, barterCycle});
		if(response.success){
			return response.barter;
		}
		throw new Error(response.message || "Failed to add barter item");
	},

	removeBarterItem : async(characterId:number, barterId:number):Promise<void> => {
		const response = await apiService.delete<ApiResponse>(`/user/todo/barter/${characterId}/${barterId}`);
		if(!response.success){
			throw new Error(response.message || "Failed to remove barter item");
		}
	},

	toggleBarterComplete : async(characterId:number, barterId:number, completedCount?:number):Promise<UserTodoBarter> => {
		const requestBody = Number.isFinite(completedCount)
			? {completedCount : Math.max(0, Math.floor(completedCount as number))}
			: undefined;
		const response = await apiService.put<ApiResponse & {barter:UserTodoBarter}>(
			`/user/todo/barter/${characterId}/${barterId}/toggle`,
			requestBody
		);
		if(response.success){
			return response.barter;
		}
		throw new Error(response.message || "Failed to toggle barter");
	},

	getMonsters : async(type?:string):Promise<GameMonster[]> => {
		const params = type ? {type} : undefined;
		const response = await apiService.get<ApiResponse & {monsters:GameMonster[]}>("/monsters", params);
		if(response.success){
			return response.monsters;
		}
		throw new Error(response.message || "Failed to fetch monsters");
	}
};

export default todoService;
