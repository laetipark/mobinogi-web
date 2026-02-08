import {apiService} from "./api";

interface UploadResponse{
	success:boolean;
	url?:string;
	message?:string;
}

class UploadService{
	async uploadImage(
		file:File,
		type:"profile" | "board" = "board",
		onProgress?:(progress:number) => void
	):Promise<UploadResponse>{
		const formData = new FormData();
		formData.append("file", file);
		formData.append("type", type);

		return apiService.upload<UploadResponse>(`/upload/image?type=${type}`, file, onProgress);
	}

	async deleteImage(url:string):Promise<UploadResponse>{
		return apiService.delete<UploadResponse>(`/upload/image?url=${encodeURIComponent(url)}`);
	}
}

export const uploadService = new UploadService();
