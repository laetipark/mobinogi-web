import type {PageResponse} from "./common";

export interface PhotoBoardPost{
	photoPostId:number;
	userId:number | null;
	authorNickname:string | null;
	authorProfileImage:string | null;
	title:string;
	description:string | null;
	imageUrl:string;
	tags:string[];
	viewCount:number;
	likeCount:number;
	likedByCurrentUser?:boolean;
	createdAt:string;
	updatedAt:string;
}

export interface PhotoBoardPostCreateRequest{
	title:string;
	description?:string;
	imageUrl:string;
	tags:string[];
}

export type PhotoBoardPostPage = PageResponse<PhotoBoardPost>;
