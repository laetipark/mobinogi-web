import {apiService} from "./api";
import type {ApiResponse} from "../types";

class UploadService{
	async uploadImage(
		file:File,
		type:"profile" | "board" = "board",
		onProgress?:(progress:number) => void
	):Promise<ApiResponse & {url?:string}>{
		const formData = new FormData();
		formData.append("file", file);
		formData.append("type", type);

		return apiService.upload<ApiResponse & {url?:string}>(`/upload/image?type=${type}`, file, onProgress);
	}

	async deleteImage(url:string):Promise<ApiResponse & {url?:string}>{
		return apiService.delete<ApiResponse & {url?:string}>(`/upload/image?url=${encodeURIComponent(url)}`);
	}
}

export const uploadService = new UploadService();
