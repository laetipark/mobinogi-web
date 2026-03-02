import {apiService} from "./api";
import type {ApiResponse, PhotoBoardPost, PhotoBoardPostCreateRequest, PhotoBoardPostPage} from "@/types";

/**
 * Normalizes tag query string to match backend rules.
 *
 * @param tag raw tag input
 * @returns normalized tag without leading '#'
 */
const normalizeTagParam = (tag?:string | null):string => tag?.trim().replace(/^#+/, "").trim() ?? "";

/**
 * Constant photoBoardService.
 */
export const photoBoardService = {
	/**
	 * Fetches paged gallery posts.
	 *
	 * @param page page index (0-based)
	 * @param size page size
	 * @param keyword optional search keyword
	 * @param tag optional tag filter
	 * @returns paged post response data
	 */
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

		const normalizedTag = normalizeTagParam(tag);
		if(normalizedTag.length > 0 && normalizedTag !== "ALL"){
			params.tag = normalizedTag;
		}

		const response = await apiService.get<ApiResponse & {data:PhotoBoardPostPage}>("/photo-board/posts", params);
		if(response.success){
			return response.data as PhotoBoardPostPage;
		}
		throw new Error(response.message || "Failed to load photo posts.");
	},

	/**
	 * Fetches post detail by post ID.
	 *
	 * @param photoPostId post ID
	 * @returns post detail
	 */
	getPost: async(photoPostId:number):Promise<PhotoBoardPost> => {
		const response = await apiService.get<ApiResponse & {post:PhotoBoardPost}>(`/photo-board/posts/${photoPostId}`);
		if(response.success){
			return response.post;
		}
		throw new Error(response.message || "Failed to load photo post.");
	},

	/**
	 * Fetches post detail by title slug.
	 *
	 * @param slug title-based slug
	 * @returns post detail
	 */
	getPostBySlug: async(slug:string):Promise<PhotoBoardPost> => {
		const response = await apiService.get<ApiResponse & {post:PhotoBoardPost}>(`/photo-board/posts/by-slug/${encodeURIComponent(slug)}`);
		if(response.success){
			return response.post;
		}
		throw new Error(response.message || "Failed to load photo post.");
	},

	/**
	 * Creates a post.
	 *
	 * @param request post create request payload
	 * @returns created post
	 */
	createPost: async(request:PhotoBoardPostCreateRequest):Promise<PhotoBoardPost> => {
		const response = await apiService.post<ApiResponse & {post:PhotoBoardPost}>("/photo-board/posts", request);
		if(response.success){
			return response.post;
		}
		throw new Error(response.message || "Failed to create photo post.");
	},

	/**
	 * Updates a post.
	 *
	 * @param photoPostId post ID
	 * @param request post update request payload
	 * @returns updated post
	 */
	updatePost: async(photoPostId:number, request:PhotoBoardPostCreateRequest):Promise<PhotoBoardPost> => {
		const response = await apiService.put<ApiResponse & {post:PhotoBoardPost}>(`/photo-board/posts/${photoPostId}`, request);
		if(response.success){
			return response.post;
		}
		throw new Error(response.message || "Failed to update photo post.");
	},

	/**
	 * Deletes a post.
	 *
	 * @param photoPostId post ID
	 */
	deletePost: async(photoPostId:number):Promise<void> => {
		const response = await apiService.delete<ApiResponse>(`/photo-board/posts/${photoPostId}`);
		if(response.success){
			return;
		}
		throw new Error(response.message || "Failed to delete photo post.");
	},

	/**
	 * Toggles like state of a post.
	 *
	 * @param photoPostId post ID
	 * @returns updated post with like state
	 */
	toggleLike: async(photoPostId:number):Promise<PhotoBoardPost> => {
		const response = await apiService.post<ApiResponse & {post:PhotoBoardPost}>(`/photo-board/posts/${photoPostId}/like`);
		if(response.success){
			return response.post;
		}
		throw new Error(response.message || "Failed to toggle like.");
	}
};
