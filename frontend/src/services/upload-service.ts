import {apiService} from "./api";
import type {ApiResponse} from "../types";

class UploadService{
	private static readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

	private async requestUpload(
		file:File,
		type:"profile" | "board",
		onProgress?:(progress:number) => void,
		temporary:boolean = false
	):Promise<ApiResponse & {url?:string}>{
		return apiService.upload<ApiResponse & {url?:string}>(
			`/upload/image?type=${type}&temporary=${temporary}`,
			file,
			onProgress
		);
	}

	async uploadImage(
		file:File,
		type:"profile" | "board" = "board",
		onProgress?:(progress:number) => void
	):Promise<ApiResponse & {url?:string}>{
		if(file.size > UploadService.MAX_IMAGE_SIZE){
			return {
				success : false,
				message : "File size must be 5MB or less."
			};
		}

		try{
			return await this.requestUpload(file, type, onProgress, false);
		}catch(error:any){
			const status = error?.response?.status;
			const message:string = error?.response?.data?.message || "";

			if(status === 400 && type === "profile" && message.includes("Unsupported upload type")){
				try{
					return await this.requestUpload(file, "board", onProgress);
				}catch(retryError:any){
					const retryStatus = retryError?.response?.status;
					if(retryStatus === 413){
						return {
							success : false,
							message : "Image payload is too large for the server limit."
						};
					}
					return {
						success : false,
						message : retryError?.response?.data?.message || retryError?.message || "Image upload failed."
					};
				}
			}

			if(status === 413){
				return {
					success : false,
					message : "Image payload is too large for the server limit."
				};
			}

			return {
				success : false,
				message : error?.response?.data?.message || error?.message || "Image upload failed."
			};
		}
	}

	async uploadTempImage(
		file:File,
		type:"profile" | "board" = "board",
		onProgress?:(progress:number) => void
	):Promise<ApiResponse & {url?:string}>{
		if(file.size > UploadService.MAX_IMAGE_SIZE){
			return {
				success : false,
				message : "File size must be 5MB or less."
			};
		}

		try{
			return await this.requestUpload(file, type, onProgress, true);
		}catch(error:any){
			const status = error?.response?.status;
			if(status === 413){
				return {
					success : false,
					message : "Image payload is too large for the server limit."
				};
			}
			return {
				success : false,
				message : error?.response?.data?.message || error?.message || "Image upload failed."
			};
		}
	}

	async deleteImage(url:string):Promise<ApiResponse & {url?:string}>{
		return apiService.delete<ApiResponse & {url?:string}>(`/upload/image?url=${encodeURIComponent(url)}`);
	}
}

export const uploadService = new UploadService();
