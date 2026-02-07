import {apiService} from "./api";
import type {
	BoardCategory,
	BoardPost,
	BoardPostPage,
	BoardPostCreateRequest,
	BoardPostUpdateRequest,
	BoardComment,
	BoardCommentCreateRequest
} from "../types";

interface CategoriesResponse{
	success:boolean;
	categories:BoardCategory[];
	message?:string;
}

interface PostsResponse{
	success:boolean;
	data:BoardPostPage;
	message?:string;
}

interface PostResponse{
	success:boolean;
	post:BoardPost;
	message?:string;
}

interface ExternalPostsResponse{
	success:boolean;
	data:BoardPost[];
	message?:string;
}

interface CommentsResponse{
	success:boolean;
	comments:BoardComment[];
	message?:string;
}

interface CommentResponse{
	success:boolean;
	comment:BoardComment;
	message?:string;
}

interface BaseResponse{
	success:boolean;
	message?:string;
}

export const boardService = {
	// 카테고리
	getCategories: async ():Promise<BoardCategory[]> => {
		const response = await apiService.get<CategoriesResponse>("/board/categories");
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

		const response = await apiService.get<PostsResponse>("/board/posts", params);
		if(response.success) return response.data;
		throw new Error(response.message || "게시글을 불러오는데 실패했습니다.");
	},

	// Discord 캐시 게시글
	getDiscordPosts: async ():Promise<BoardPost[]> => {
		const response = await apiService.get<ExternalPostsResponse>("/board/external/discord");
		if(response.success) return response.data;
		throw new Error(response.message || "Discord 게시글을 불러오는데 실패했습니다.");
	},

	// Notion 캐시 게시글
	getNotionPosts: async ():Promise<BoardPost[]> => {
		const response = await apiService.get<ExternalPostsResponse>("/board/external/notion");
		if(response.success) return response.data;
		throw new Error(response.message || "Notion 게시글을 불러오는데 실패했습니다.");
	},

	// 게시글 상세
	getPost: async (postId:number):Promise<BoardPost> => {
		const response = await apiService.get<PostResponse>(`/board/posts/${postId}`);
		if(response.success) return response.post;
		throw new Error(response.message || "게시글을 불러오는데 실패했습니다.");
	},

	// 게시글 작성
	createPost: async (request:BoardPostCreateRequest):Promise<BoardPost> => {
		const response = await apiService.post<PostResponse>("/board/posts", request);
		if(response.success) return response.post;
		throw new Error(response.message || "게시글 작성에 실패했습니다.");
	},

	// 게시글 수정
	updatePost: async (postId:number, request:BoardPostUpdateRequest):Promise<BoardPost> => {
		const response = await apiService.put<PostResponse>(`/board/posts/${postId}`, request);
		if(response.success) return response.post;
		throw new Error(response.message || "게시글 수정에 실패했습니다.");
	},

	// 게시글 삭제
	deletePost: async (postId:number):Promise<void> => {
		const response = await apiService.delete<BaseResponse>(`/board/posts/${postId}`);
		if(!response.success) throw new Error(response.message || "게시글 삭제에 실패했습니다.");
	},

	// 댓글 목록
	getComments: async (postId:number):Promise<BoardComment[]> => {
		const response = await apiService.get<CommentsResponse>(`/board/posts/${postId}/comments`);
		if(response.success) return response.comments;
		throw new Error(response.message || "댓글을 불러오는데 실패했습니다.");
	},

	// 댓글 작성
	createComment: async (postId:number, request:BoardCommentCreateRequest):Promise<BoardComment> => {
		const response = await apiService.post<CommentResponse>(`/board/posts/${postId}/comments`, request);
		if(response.success) return response.comment;
		throw new Error(response.message || "댓글 작성에 실패했습니다.");
	},

	// 댓글 수정
	updateComment: async (commentId:number, content:string):Promise<BoardComment> => {
		const response = await apiService.put<CommentResponse>(`/board/comments/${commentId}`, {content});
		if(response.success) return response.comment;
		throw new Error(response.message || "댓글 수정에 실패했습니다.");
	},

	// 댓글 삭제
	deleteComment: async (commentId:number):Promise<void> => {
		const response = await apiService.delete<BaseResponse>(`/board/comments/${commentId}`);
		if(!response.success) throw new Error(response.message || "댓글 삭제에 실패했습니다.");
	}
};
