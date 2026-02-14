import type {PageResponse} from "./common";

export interface BoardCategory{
	categoryId:number;
	categoryName:string;
	displayOrder:number;
}

export interface BoardPost{
	postId:number;
	categoryId:number | null;
	categoryName:string | null;
	userId:number | null;
	authorNickname:string | null;
	authorProfileImage:string | null;
	authorDiscordId?:string | null;
	title:string;
	content:string;
	viewCount:number;
	sourceType:"USER" | "DISCORD" | string;
	externalUrl:string | null;
	externalAuthor:string | null;
	images?:string[];
	isWiki?:boolean;
	commentCount:number;
	createdAt:string;
	updatedAt:string;
}

export interface BoardPostCreateRequest{
	categoryId:number | null;
	title:string;
	content:string;
	isWiki?:boolean;
}

export interface BoardPostUpdateRequest{
	categoryId:number | null;
	title:string;
	content:string;
	isWiki?:boolean;
}

export interface BoardComment{
	commentId:number;
	postId:number;
	userId:number;
	authorNickname:string | null;
	authorProfileImage:string | null;
	parentCommentId:number | null;
	content:string;
	createdAt:string;
	updatedAt:string;
	replies?:BoardComment[];
}

export interface BoardCommentCreateRequest{
	parentCommentId?:number | null;
	content:string;
}

export interface BoardPostHistory{
	historyId:number;
	postId:number;
	userId:number;
	editorNickname:string | null;
	title:string;
	content:string;
	createdAt:string;
}

export type BoardPostPage = PageResponse<BoardPost>;
