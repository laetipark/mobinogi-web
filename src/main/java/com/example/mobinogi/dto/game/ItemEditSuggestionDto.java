package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.game.ItemEditSuggestion;
import com.example.mobinogi.entity.game.ItemEditSuggestionStatus;
import com.example.mobinogi.entity.game.ItemEditSuggestionTargetType;
import com.example.mobinogi.entity.game.SheetSyncStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Item edit suggestion DTO.
 */
@Getter
@Builder
public class ItemEditSuggestionDto{

	/** Suggestion ID. */
	private Long suggestionId;

	/** Item name. */
	private String itemName;

	/** Target data type. */
	private ItemEditSuggestionTargetType targetType;

	/** Target record ID. */
	private Long targetRecordId;

	/** Field key to edit. */
	private String fieldKey;

	/** Current field value. */
	private String currentValue;

	/** Suggested field value. */
	private String suggestedValue;

	/** Suggestion reason. */
	private String reason;

	/** Suggestion status. */
	private ItemEditSuggestionStatus status;

	/** Requester user ID. */
	private Long requesterUserId;

	/** Requester nickname. */
	private String requesterNickname;

	/** Reviewer user ID. */
	private Long reviewerUserId;

	/** Reviewer nickname. */
	private String reviewerNickname;

	/** Review note. */
	private String reviewNote;

	/** Sheet-sync status. */
	private SheetSyncStatus sheetSyncStatus;

	/** Sheet-sync status message. */
	private String sheetSyncMessage;

	/** Sheet-sync updated range. */
	private String sheetSyncRange;

	/** Approval timestamp. */
	private LocalDateTime approvedAt;

	/** Rejection timestamp. */
	private LocalDateTime rejectedAt;

	/** Sheet-sync timestamp. */
	private LocalDateTime sheetSyncedAt;

	/** Created timestamp. */
	private LocalDateTime createdAt;

	/** Updated timestamp. */
	private LocalDateTime updatedAt;

	/**
	 * Converts entity to DTO.
	 *
	 * @param entity suggestion entity
	 * @return DTO instance
	 */
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
