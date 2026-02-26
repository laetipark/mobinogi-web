import {apiService} from "./api";
import type {
	ApiResponse,
	BoardCategory,
	BoardPost,
	BoardPostPage,
	BoardPostCreateRequest,
	BoardPostUpdateRequest,
	BoardComment,
	BoardCommentCreateRequest,
	BoardPostHistory
} from "../types";

export const boardService = {
	getCategories: async ():Promise<BoardCategory[]> => {
		const response = await apiService.get<ApiResponse & {categories:BoardCategory[]}>("/board/categories");
		if(response.success) return response.categories;
		throw new Error(response.message || "Failed to load categories.");
	},

	getPosts: async (
		page:number = 0,
		size:number = 20,
		categoryId?:number | null,
		sourceType?:string | null,
		keyword?:string | null
	):Promise<BoardPostPage> => {
		const params:Record<string, any> = {page, size};
		if(categoryId) params.categoryId = categoryId;
		if(sourceType) params.sourceType = sourceType;
		if(keyword) params.keyword = keyword;

		const response = await apiService.get<ApiResponse & {data:BoardPostPage}>("/board/posts", params);
		if(response.success) return response.data;
		throw new Error(response.message || "Failed to load posts.");
	},

	getPost: async (postId:number):Promise<BoardPost> => {
		const response = await apiService.get<ApiResponse & {post:BoardPost}>(`/board/posts/${postId}`);
		if(response.success) return response.post;
		throw new Error(response.message || "Failed to load post.");
	},

	getPostBySlug: async (slug:string):Promise<BoardPost> => {
		const response = await apiService.get<ApiResponse & {post:BoardPost}>("/board/posts/by-slug", {slug});
		if(response.success) return response.post;
		throw new Error(response.message || "Failed to load post.");
	},

	createPost: async (request:BoardPostCreateRequest):Promise<BoardPost> => {
		const response = await apiService.post<ApiResponse & {post:BoardPost}>("/board/posts", request);
		if(response.success) return response.post;
		throw new Error(response.message || "Failed to create post.");
	},

	updatePost: async (postId:number, request:BoardPostUpdateRequest):Promise<BoardPost> => {
		const response = await apiService.put<ApiResponse & {post:BoardPost}>(`/board/posts/${postId}`, request);
		if(response.success) return response.post;
		throw new Error(response.message || "Failed to update post.");
	},

	deletePost: async (postId:number):Promise<void> => {
		const response = await apiService.delete<ApiResponse>(`/board/posts/${postId}`);
		if(!response.success) throw new Error(response.message || "Failed to delete post.");
	},

	getPostHistory: async (postId:number):Promise<BoardPostHistory[]> => {
		const response = await apiService.get<ApiResponse & {history:BoardPostHistory[]}>(`/board/posts/${postId}/history`);
		if(response.success) return response.history;
		throw new Error(response.message || "Failed to load post history.");
	},

	getComments: async (postId:number):Promise<BoardComment[]> => {
		const response = await apiService.get<ApiResponse & {comments:BoardComment[]}>(`/board/posts/${postId}/comments`);
		if(response.success) return response.comments;
		throw new Error(response.message || "Failed to load comments.");
	},

	createComment: async (postId:number, request:BoardCommentCreateRequest):Promise<BoardComment> => {
		const response = await apiService.post<ApiResponse & {comment:BoardComment}>(`/board/posts/${postId}/comments`, request);
		if(response.success) return response.comment;
		throw new Error(response.message || "Failed to create comment.");
	},

	updateComment: async (commentId:number, content:string):Promise<BoardComment> => {
		const response = await apiService.put<ApiResponse & {comment:BoardComment}>(`/board/comments/${commentId}`, {content});
		if(response.success) return response.comment;
		throw new Error(response.message || "Failed to update comment.");
	},

	deleteComment: async (commentId:number):Promise<void> => {
		const response = await apiService.delete<ApiResponse>(`/board/comments/${commentId}`);
		if(!response.success) throw new Error(response.message || "Failed to delete comment.");
	}
};
