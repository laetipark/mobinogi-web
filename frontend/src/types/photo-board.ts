import type {PageResponse} from "./common";

/** Photo board post DTO. */
export interface PhotoBoardPost{
	photoPostId:number | null;
	userId:number | null;
	authorNickname:string | null;
	authorProfileImage:string | null;
	title:string;
	description:string | null;
	imageUrls:string[];
	tags:string[];
	viewCount:number;
	likeCount:number;
	likedByCurrentUser?:boolean;
	createdAt:string;
	updatedAt:string;
}

/** Photo board post create/update request DTO. */
export interface PhotoBoardPostCreateRequest{
	title:string;
	description?:string;
	imageUrls:string[];
	tags:string[];
}

/** Photo board page response type alias. */
export type PhotoBoardPostPage = PageResponse<PhotoBoardPost>;
