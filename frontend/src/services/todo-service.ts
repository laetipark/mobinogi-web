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

	addBarterItem : async(characterId:number, barterId:number, barterCycle:string):Promise<UserTodoBarter> => {
		const response = await apiService.post<ApiResponse & {barter:UserTodoBarter}>(`/user/todo/barter/${characterId}`, {barterId, barterCycle});
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

	toggleBarterComplete : async(characterId:number, barterId:number):Promise<UserTodoBarter[]> => {
		const response = await apiService.put<ApiResponse & {barters:UserTodoBarter[]}>(`/user/todo/barter/${characterId}/${barterId}/toggle`);
		if(response.success){
			return response.barters;
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
