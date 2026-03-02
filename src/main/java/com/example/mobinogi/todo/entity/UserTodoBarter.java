package com.example.mobinogi.todo.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * User barter TODO item entity.
 */
@Entity
@Table(name = "user_todo_barter")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class UserTodoBarter{

	/** Row ID. */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field id.
	 */
	private Long id;

	/** Owner user ID. */
	@Column(name = "user_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field userId.
	 */
	private Long userId;

	/** Owner character ID. */
	@Column(name = "character_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field characterId.
	 */
	private Long characterId;

	/** Reward item name. */
	@Column(name = "item_name", nullable = false, length = 200)
	/**
	 * Field itemName.
	 */
	private String itemName;

	/** Exchange item name. */
	@Column(name = "exchange_item_name", nullable = false, length = 200)
	/**
	 * Field exchangeItemName.
	 */
	private String exchangeItemName;

	/** NPC name. */
	@Column(name = "npc_name", nullable = false, length = 100)
	/**
	 * Field npcName.
	 */
	private String npcName;

	/** Region name. */
	@Column(name = "region_name", nullable = false, length = 100)
	/**
	 * Field regionName.
	 */
	private String regionName;

	/** Exchange cost quantity. */
	@Column(name = "exchange_cost")
	/**
	 * Field exchangeCost.
	 */
	private Integer exchangeCost;

	/** Barter cycle text (daily/weekly). */
	@Column(name = "barter_cycle", length = 10)
	/**
	 * Field barterCycle.
	 */
	private String barterCycle;

	/** Completion flag. */
	@Column(name = "completed", nullable = false)
	/**
	 * Field completed.
	 */
	private Boolean completed;

	/** Completed count. */
	@Column(name = "completed_count", nullable = false, columnDefinition = "INT DEFAULT 0")
	/**
	 * Field completedCount.
	 */
	private Integer completedCount;

	/** Last checker user ID. */
	@Column(name = "checked_by_user_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field checkedByUserId.
	 */
	private Long checkedByUserId;

	/** Last checker nickname. */
	@Column(name = "checked_by_nickname", length = 100)
	/**
	 * Field checkedByNickname.
	 */
	private String checkedByNickname;

	/** Last checker character ID. */
	@Column(name = "checked_by_character_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field checkedByCharacterId.
	 */
	private Long checkedByCharacterId;

	/** Last checker character name. */
	@Column(name = "checked_by_character_name", length = 100)
	/**
	 * Field checkedByCharacterName.
	 */
	private String checkedByCharacterName;

	/** Last checked timestamp. */
	@Column(name = "checked_at", columnDefinition = "TIMESTAMP")
	/**
	 * Field checkedAt.
	 */
	private LocalDateTime checkedAt;

	/** Created timestamp. */
	@Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
	/**
	 * Field createdAt.
	 */
	private LocalDateTime createdAt;

	/** Updated timestamp. */
	@Column(name = "updated_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
	/**
	 * Field updatedAt.
	 */
	private LocalDateTime updatedAt;

	/** Soft-delete timestamp. */
	@Column(name = "deleted_at", columnDefinition = "TIMESTAMP")
	/**
	 * Field deletedAt.
	 */
	private LocalDateTime deletedAt;

	/**
	 * Initializes timestamps and completion defaults on insert.
	 */
	@PrePersist
	public void prePersist(){
		this.createdAt = LocalDateTime.now();
		this.updatedAt = LocalDateTime.now();
		if(this.completed == null){
			this.completed = false;
		}
		if(this.completedCount == null || this.completedCount < 0){
			this.completedCount = this.completed ? 1 : 0;
		}
		if(this.completed && this.completedCount == 0){
			this.completedCount = 1;
		}
	}

	/**
	 * Normalizes completion count and updates timestamp on update.
	 */
	@PreUpdate
	public void preUpdate(){
		this.updatedAt = LocalDateTime.now();
		if(this.completedCount == null || this.completedCount < 0){
			this.completedCount = 0;
		}
		if(Boolean.TRUE.equals(this.completed) && this.completedCount == 0){
			this.completedCount = 1;
		}
	}
}
