export type ItemEditSuggestionTargetType = "ITEM" | "BARTER" | "CRAFT";
export type ItemEditSuggestionStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ItemEditSheetSyncStatus = "NOT_STARTED" | "SYNCED" | "FAILED" | "SKIPPED";

export interface ItemEditSuggestion{
	suggestionId:number;
	itemName:string;
	targetType:ItemEditSuggestionTargetType;
	targetRecordId:number | null;
	fieldKey:string;
	currentValue:string | null;
	suggestedValue:string;
	reason:string | null;
	status:ItemEditSuggestionStatus;
	requesterUserId:number | null;
	requesterNickname:string | null;
	reviewerUserId:number | null;
	reviewerNickname:string | null;
	reviewNote:string | null;
	sheetSyncStatus:ItemEditSheetSyncStatus;
	sheetSyncMessage:string | null;
	sheetSyncRange:string | null;
	approvedAt:string | null;
	rejectedAt:string | null;
	sheetSyncedAt:string | null;
	createdAt:string;
	updatedAt:string;
}

export interface ItemEditSuggestionCreateRequest{
	itemName:string;
	targetType:ItemEditSuggestionTargetType;
	targetRecordId?:number;
	fieldKey:string;
	currentValue?:string;
	suggestedValue:string;
	reason?:string;
}
