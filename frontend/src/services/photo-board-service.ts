import {apiService} from "./api";
import type {ApiResponse, PhotoBoardPost, PhotoBoardPostCreateRequest, PhotoBoardPostPage} from "@/types";

export const photoBoardService = {
	getPosts: async(
		page:number = 0,
		size:number = 20,
		keyword?:string | null,
		tag?:string | null
	):Promise<PhotoBoardPostPage> => {
		const params:Record<string, string | number> = {page, size};
		if(keyword && keyword.trim().length > 0){
			params.keyword = keyword.trim();
		}
		if(tag && tag.trim().length > 0 && tag !== "ALL"){
			params.tag = tag.trim();
		}

		const response = await apiService.get<ApiResponse & {data:PhotoBoardPostPage}>("/photo-board/posts", params);
		if(response.success) return response.data;
		throw new Error(response.message || "사진 게시글을 불러오지 못했습니다.");
	},

	getPost: async(photoPostId:number):Promise<PhotoBoardPost> => {
		const response = await apiService.get<ApiResponse & {post:PhotoBoardPost}>(`/photo-board/posts/${photoPostId}`);
		if(response.success) return response.post;
		throw new Error(response.message || "사진 게시글을 불러오지 못했습니다.");
	},

	createPost: async(request:PhotoBoardPostCreateRequest):Promise<PhotoBoardPost> => {
		const response = await apiService.post<ApiResponse & {post:PhotoBoardPost}>("/photo-board/posts", request);
		if(response.success) return response.post;
		throw new Error(response.message || "사진 게시글 등록에 실패했습니다.");
	},

	updatePost: async(photoPostId:number, request:PhotoBoardPostCreateRequest):Promise<PhotoBoardPost> => {
		const response = await apiService.put<ApiResponse & {post:PhotoBoardPost}>(`/photo-board/posts/${photoPostId}`, request);
		if(response.success) return response.post;
		throw new Error(response.message || "사진 게시글 수정에 실패했습니다.");
	},

	deletePost: async(photoPostId:number):Promise<void> => {
		const response = await apiService.delete<ApiResponse>(`/photo-board/posts/${photoPostId}`);
		if(response.success) return;
		throw new Error(response.message || "사진 게시글 삭제에 실패했습니다.");
	},

	toggleLike: async(photoPostId:number):Promise<PhotoBoardPost> => {
		const response = await apiService.post<ApiResponse & {post:PhotoBoardPost}>(`/photo-board/posts/${photoPostId}/like`);
		if(response.success) return response.post;
		throw new Error(response.message || "좋아요 처리에 실패했습니다.");
	}
};
