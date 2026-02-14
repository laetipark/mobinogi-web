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
	// 카테고리
	getCategories: async ():Promise<BoardCategory[]> => {
		const response = await apiService.get<ApiResponse & {categories:BoardCategory[]}>("/board/categories");
		if(response.success) return response.categories;
		throw new Error(response.message || "카테고리를 불러오는데 실패했습니다.");
	},

	// 게시글 목록 (DB - USER 게시글)
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
		throw new Error(response.message || "게시글을 불러오는데 실패했습니다.");
	},

	// Discord 캐시 게시글
	getDiscordPosts: async ():Promise<BoardPost[]> => {
		const response = await apiService.get<ApiResponse & {data:BoardPost[]}>("/board/external/discord");
		if(response.success) return response.data;
		throw new Error(response.message || "Discord 게시글을 불러오는데 실패했습니다.");
	},

	// 게시글 상세
	getPost: async (postId:number):Promise<BoardPost> => {
		const response = await apiService.get<ApiResponse & {post:BoardPost}>(`/board/posts/${postId}`);
		if(response.success) return response.post;
		throw new Error(response.message || "게시글을 불러오는데 실패했습니다.");
	},

	// 게시글 작성
	createPost: async (request:BoardPostCreateRequest):Promise<BoardPost> => {
		const response = await apiService.post<ApiResponse & {post:BoardPost}>("/board/posts", request);
		if(response.success) return response.post;
		throw new Error(response.message || "게시글 작성에 실패했습니다.");
	},

	// 게시글 수정
	updatePost: async (postId:number, request:BoardPostUpdateRequest):Promise<BoardPost> => {
		const response = await apiService.put<ApiResponse & {post:BoardPost}>(`/board/posts/${postId}`, request);
		if(response.success) return response.post;
		throw new Error(response.message || "게시글 수정에 실패했습니다.");
	},

	// 게시글 삭제
	deletePost: async (postId:number):Promise<void> => {
		const response = await apiService.delete<ApiResponse>(`/board/posts/${postId}`);
		if(!response.success) throw new Error(response.message || "게시글 삭제에 실패했습니다.");
	},

	// 수정 내역
	getPostHistory: async (postId:number):Promise<BoardPostHistory[]> => {
		const response = await apiService.get<ApiResponse & {history:BoardPostHistory[]}>(`/board/posts/${postId}/history`);
		if(response.success) return response.history;
		throw new Error(response.message || "수정 내역을 불러오는데 실패했습니다.");
	},

	// 댓글 목록
	getComments: async (postId:number):Promise<BoardComment[]> => {
		const response = await apiService.get<ApiResponse & {comments:BoardComment[]}>(`/board/posts/${postId}/comments`);
		if(response.success) return response.comments;
		throw new Error(response.message || "댓글을 불러오는데 실패했습니다.");
	},

	// 댓글 작성
	createComment: async (postId:number, request:BoardCommentCreateRequest):Promise<BoardComment> => {
		const response = await apiService.post<ApiResponse & {comment:BoardComment}>(`/board/posts/${postId}/comments`, request);
		if(response.success) return response.comment;
		throw new Error(response.message || "댓글 작성에 실패했습니다.");
	},

	// 댓글 수정
	updateComment: async (commentId:number, content:string):Promise<BoardComment> => {
		const response = await apiService.put<ApiResponse & {comment:BoardComment}>(`/board/comments/${commentId}`, {content});
		if(response.success) return response.comment;
		throw new Error(response.message || "댓글 수정에 실패했습니다.");
	},

	// 댓글 삭제
	deleteComment: async (commentId:number):Promise<void> => {
		const response = await apiService.delete<ApiResponse>(`/board/comments/${commentId}`);
		if(!response.success) throw new Error(response.message || "댓글 삭제에 실패했습니다.");
	}
};
