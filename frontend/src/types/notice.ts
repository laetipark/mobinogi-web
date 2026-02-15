export type NoticeCategory = "notice" | "updateNote" | "erinNote";

export interface GameNotice{
	noticeId:string;
	noticeType:string;
	title:string;
	publishedDate:string | null;
}
