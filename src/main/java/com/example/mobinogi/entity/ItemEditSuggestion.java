package com.example.mobinogi.entity;

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
	private Long suggestionId;

	@Column(name = "item_name", nullable = false, length = 200)
	private String itemName;

	@Enumerated(EnumType.STRING)
	@Column(name = "target_type", nullable = false, length = 20)
	private ItemEditSuggestionTargetType targetType;

	@Column(name = "target_record_id", columnDefinition = "BIGINT UNSIGNED")
	private Long targetRecordId;

	@Column(name = "field_key", nullable = false, length = 100)
	private String fieldKey;

	@Column(name = "current_value", columnDefinition = "TEXT")
	private String currentValue;

	@Column(name = "suggested_value", nullable = false, columnDefinition = "TEXT")
	private String suggestedValue;

	@Column(name = "reason", columnDefinition = "TEXT")
	private String reason;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 20)
	private ItemEditSuggestionStatus status;

	@Column(name = "requester_user_id", columnDefinition = "BIGINT UNSIGNED")
	private Long requesterUserId;

	@Column(name = "requester_nickname", length = 100)
	private String requesterNickname;

	@Column(name = "reviewer_user_id", columnDefinition = "BIGINT UNSIGNED")
	private Long reviewerUserId;

	@Column(name = "reviewer_nickname", length = 100)
	private String reviewerNickname;

	@Column(name = "review_note", columnDefinition = "TEXT")
	private String reviewNote;

	@Enumerated(EnumType.STRING)
	@Column(name = "sheet_sync_status", nullable = false, length = 20)
	private SheetSyncStatus sheetSyncStatus;

	@Column(name = "sheet_sync_message", columnDefinition = "TEXT")
	private String sheetSyncMessage;

	@Column(name = "sheet_sync_range", length = 120)
	private String sheetSyncRange;

	@Column(name = "approved_at")
	private LocalDateTime approvedAt;

	@Column(name = "rejected_at")
	private LocalDateTime rejectedAt;

	@Column(name = "sheet_synced_at")
	private LocalDateTime sheetSyncedAt;

	@Column(name = "created_at", updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;

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

	@PreUpdate
	protected void onUpdate(){
		this.updatedAt = LocalDateTime.now();
	}
}
