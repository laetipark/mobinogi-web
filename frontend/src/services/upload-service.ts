import {apiService} from "./api";
import type {ApiResponse} from "../types";

/**
 * Shared upload service for image APIs.
 */
class UploadService{
	/** Max allowed image size per file (30MB). */
	private static readonly MAX_IMAGE_SIZE = 30 * 1024 * 1024;

	/**
	 * Validates image size before upload.
	 *
	 * @param file upload file
	 * @returns error response when invalid, otherwise `null`
	 */
	private validateImageSize(file:File):ApiResponse | null{
		if(file.size > UploadService.MAX_IMAGE_SIZE){
			return {
				success : false,
				message : "File size must be 30MB or less."
			};
		}
		return null;
	}

	/**
	 * Calls upload API.
	 *
	 * @param file upload file
	 * @param type upload type
	 * @param onProgress progress callback
	 * @param temporary temporary upload flag
	 * @returns upload API response
	 */
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

	/**
	 * Uploads image to final path.
	 *
	 * @param file upload file
	 * @param type upload type
	 * @param onProgress progress callback
	 * @returns upload API response
	 */
	async uploadImage(
		file:File,
		type:"profile" | "board" = "board",
		onProgress?:(progress:number) => void
	):Promise<ApiResponse & {url?:string}>{
		const validationResult = this.validateImageSize(file);
		if(validationResult){
			return validationResult;
		}

		try{
			return await this.requestUpload(file, type, onProgress, false);
		}catch(error:any){
			const status = error?.response?.status;
			const message:string = error?.response?.data?.message || "";

			// Legacy servers may reject `profile`; retry once with `board`.
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

	/**
	 * Uploads image to temporary path.
	 *
	 * @param file upload file
	 * @param type upload type
	 * @param onProgress progress callback
	 * @returns upload API response
	 */
	async uploadTempImage(
		file:File,
		type:"profile" | "board" = "board",
		onProgress?:(progress:number) => void
	):Promise<ApiResponse & {url?:string}>{
		const validationResult = this.validateImageSize(file);
		if(validationResult){
			return validationResult;
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

	/**
	 * Uploads multiple images sequentially.
	 *
	 * @param files upload files
	 * @param type upload type
	 * @param onProgress aggregate progress callback
	 * @returns uploaded URL array response
	 */
	async uploadTempImages(
		files:File[],
		type:"profile" | "board" = "board",
		onProgress?:(progress:number) => void
	):Promise<ApiResponse & {urls?:string[]}>{
		const normalizedFiles = files.filter(Boolean);
		if(normalizedFiles.length === 0){
			return {
				success : false,
				message : "No files selected."
			};
		}

		const uploadedUrls:string[] = [];
		for(let i = 0; i < normalizedFiles.length; i += 1){
			const result = await this.uploadTempImage(normalizedFiles[i], type, (fileProgress) => {
				if(!onProgress){
					return;
				}
				// Convert per-file progress into total progress.
				const aggregateProgress = Math.round(((i + (fileProgress / 100)) / normalizedFiles.length) * 100);
				onProgress(aggregateProgress);
			});

			if(!result.success || !result.url){
				return {
					success : false,
					message : result.message || "Image upload failed."
				};
			}
			uploadedUrls.push(result.url);
		}

		onProgress?.(100);
		return {
			success : true,
			urls : uploadedUrls
		};
	}

	/**
	 * Deletes uploaded image by URL.
	 *
	 * @param url image URL to delete
	 * @returns delete API response
	 */
	async deleteImage(url:string):Promise<ApiResponse & {url?:string}>{
		return apiService.delete<ApiResponse & {url?:string}>(`/upload/image?url=${encodeURIComponent(url)}`);
	}
}

/**
 * Constant uploadService.
 */
export const uploadService = new UploadService();
