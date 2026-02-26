package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.ItemEditSuggestion;
import com.example.mobinogi.entity.ItemEditSuggestionStatus;
import com.example.mobinogi.entity.ItemEditSuggestionTargetType;
import com.example.mobinogi.entity.SheetSyncStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ItemEditSuggestionDto{
	private Long suggestionId;
	private String itemName;
	private ItemEditSuggestionTargetType targetType;
	private Long targetRecordId;
	private String fieldKey;
	private String currentValue;
	private String suggestedValue;
	private String reason;
	private ItemEditSuggestionStatus status;
	private Long requesterUserId;
	private String requesterNickname;
	private Long reviewerUserId;
	private String reviewerNickname;
	private String reviewNote;
	private SheetSyncStatus sheetSyncStatus;
	private String sheetSyncMessage;
	private String sheetSyncRange;
	private LocalDateTime approvedAt;
	private LocalDateTime rejectedAt;
	private LocalDateTime sheetSyncedAt;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;

	public static ItemEditSuggestionDto fromEntity(ItemEditSuggestion entity){
		return ItemEditSuggestionDto.builder()
			.suggestionId(entity.getSuggestionId())
			.itemName(entity.getItemName())
			.targetType(entity.getTargetType())
			.targetRecordId(entity.getTargetRecordId())
			.fieldKey(entity.getFieldKey())
			.currentValue(entity.getCurrentValue())
			.suggestedValue(entity.getSuggestedValue())
			.reason(entity.getReason())
			.status(entity.getStatus())
			.requesterUserId(entity.getRequesterUserId())
			.requesterNickname(entity.getRequesterNickname())
			.reviewerUserId(entity.getReviewerUserId())
			.reviewerNickname(entity.getReviewerNickname())
			.reviewNote(entity.getReviewNote())
			.sheetSyncStatus(entity.getSheetSyncStatus())
			.sheetSyncMessage(entity.getSheetSyncMessage())
			.sheetSyncRange(entity.getSheetSyncRange())
			.approvedAt(entity.getApprovedAt())
			.rejectedAt(entity.getRejectedAt())
			.sheetSyncedAt(entity.getSheetSyncedAt())
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}
}
