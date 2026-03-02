package com.example.mobinogi.entity.game;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "item_edit_suggestion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemEditSuggestion{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "suggestion_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field suggestionId.
	 */
	private Long suggestionId;

	@Column(name = "item_name", nullable = false, length = 200)
	/**
	 * Field itemName.
	 */
	private String itemName;

	@Enumerated(EnumType.STRING)
	@Column(name = "target_type", nullable = false, length = 20)
	/**
	 * Field targetType.
	 */
	private ItemEditSuggestionTargetType targetType;

	@Column(name = "target_record_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field targetRecordId.
	 */
	private Long targetRecordId;

	@Column(name = "field_key", nullable = false, length = 100)
	/**
	 * Field fieldKey.
	 */
	private String fieldKey;

	@Column(name = "current_value", columnDefinition = "TEXT")
	/**
	 * Field currentValue.
	 */
	private String currentValue;

	@Column(name = "suggested_value", nullable = false, columnDefinition = "TEXT")
	/**
	 * Field suggestedValue.
	 */
	private String suggestedValue;

	@Column(name = "reason", columnDefinition = "TEXT")
	/**
	 * Field reason.
	 */
	private String reason;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 20)
	/**
	 * Field status.
	 */
	private ItemEditSuggestionStatus status;

	@Column(name = "requester_user_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field requesterUserId.
	 */
	private Long requesterUserId;

	@Column(name = "requester_nickname", length = 100)
	/**
	 * Field requesterNickname.
	 */
	private String requesterNickname;

	@Column(name = "reviewer_user_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field reviewerUserId.
	 */
	private Long reviewerUserId;

	@Column(name = "reviewer_nickname", length = 100)
	/**
	 * Field reviewerNickname.
	 */
	private String reviewerNickname;

	@Column(name = "review_note", columnDefinition = "TEXT")
	/**
	 * Field reviewNote.
	 */
	private String reviewNote;

	@Enumerated(EnumType.STRING)
	@Column(name = "sheet_sync_status", nullable = false, length = 20)
	/**
	 * Field sheetSyncStatus.
	 */
	private SheetSyncStatus sheetSyncStatus;

	@Column(name = "sheet_sync_message", columnDefinition = "TEXT")
	/**
	 * Field sheetSyncMessage.
	 */
	private String sheetSyncMessage;

	@Column(name = "sheet_sync_range", length = 120)
	/**
	 * Field sheetSyncRange.
	 */
	private String sheetSyncRange;

	@Column(name = "approved_at")
	/**
	 * Field approvedAt.
	 */
	private LocalDateTime approvedAt;

	@Column(name = "rejected_at")
	/**
	 * Field rejectedAt.
	 */
	private LocalDateTime rejectedAt;

	@Column(name = "sheet_synced_at")
	/**
	 * Field sheetSyncedAt.
	 */
	private LocalDateTime sheetSyncedAt;

	@Column(name = "created_at", updatable = false)
	/**
	 * Field createdAt.
	 */
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	/**
	 * Field updatedAt.
	 */
	private LocalDateTime updatedAt;

	/**
	 * Initializes default values before insert.
	 */
	@PrePersist
	protected void onCreate(){
		LocalDateTime now = LocalDateTime.now();
		this.createdAt = now;
		this.updatedAt = now;
		if(this.status == null){
			this.status = ItemEditSuggestionStatus.PENDING;
		}
		if(this.sheetSyncStatus == null){
			this.sheetSyncStatus = SheetSyncStatus.NOT_STARTED;
		}
	}

	/**
	 * Updates timestamp before update.
	 */
	@PreUpdate
	protected void onUpdate(){
		this.updatedAt = LocalDateTime.now();
	}
}

