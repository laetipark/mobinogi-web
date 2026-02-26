import type {ItemEditSuggestion, ItemEditSuggestionCreateRequest, ItemEditSuggestionStatus} from "@/types";
import apiService from "./api";

type ReportResponse = {
	success:boolean;
	report:ItemEditSuggestion;
	message?:string;
};

type ReportListResponse = {
	success:boolean;
	reports:ItemEditSuggestion[];
	message?:string;
};

type ReportReviewPayload = {
	reviewNote?:string;
	suggestedValue?:string;
};

class ItemEditReportService{
	async createReport(payload:ItemEditSuggestionCreateRequest):Promise<ItemEditSuggestion>{
		const response = await apiService.post<ReportResponse>("/item-edit-reports", payload);
		return response.report;
	}

	async getItemReports(itemName:string, status?:ItemEditSuggestionStatus):Promise<ItemEditSuggestion[]>{
		const encodedItemName = encodeURIComponent(itemName);
		const response = await apiService.get<ReportListResponse>(`/item-edit-reports/items/${encodedItemName}`, status ? {status} : undefined);
		return response.reports ?? [];
	}

	async approveReport(suggestionId:number, review?:string | ReportReviewPayload):Promise<ItemEditSuggestion>{
		const payload:ReportReviewPayload = typeof review === "string"
			? (review ? {reviewNote : review} : {})
			: (review ?? {});
		const response = await apiService.post<ReportResponse>(`/item-edit-reports/${suggestionId}/approve`, payload);
		return response.report;
	}

	async rejectReport(suggestionId:number, reviewNote?:string):Promise<ItemEditSuggestion>{
		const response = await apiService.post<ReportResponse>(`/item-edit-reports/${suggestionId}/reject`, reviewNote ? {reviewNote} : {});
		return response.report;
	}
}

const itemEditReportService = new ItemEditReportService();
export default itemEditReportService;
