package com.example.mobinogi.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_todo_barter")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class UserTodoBarter{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
	private Long id;

	@Column(name = "user_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long userId;

	@Column(name = "character_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long characterId;

	@Column(name = "item_name", nullable = false, length = 200)
	private String itemName;

	@Column(name = "exchange_item_name", nullable = false, length = 200)
	private String exchangeItemName;

	@Column(name = "npc_name", nullable = false, length = 100)
	private String npcName;

	@Column(name = "region_name", nullable = false, length = 100)
	private String regionName;

	@Column(name = "exchange_cost")
	private Integer exchangeCost;

	@Column(name = "barter_cycle", length = 10)
	private String barterCycle;

	@Column(name = "completed", nullable = false)
	private Boolean completed;

	@Column(name = "completed_count", nullable = false, columnDefinition = "INT DEFAULT 0")
	private Integer completedCount;

	@Column(name = "checked_by_user_id", columnDefinition = "BIGINT UNSIGNED")
	private Long checkedByUserId;

	@Column(name = "checked_by_nickname", length = 100)
	private String checkedByNickname;

	@Column(name = "checked_by_character_id", columnDefinition = "BIGINT UNSIGNED")
	private Long checkedByCharacterId;

	@Column(name = "checked_by_character_name", length = 100)
	private String checkedByCharacterName;

	@Column(name = "checked_at", columnDefinition = "TIMESTAMP")
	private LocalDateTime checkedAt;

	@Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
	private LocalDateTime createdAt;

	@Column(name = "updated_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
	private LocalDateTime updatedAt;

	@Column(name = "deleted_at", columnDefinition = "TIMESTAMP")
	private LocalDateTime deletedAt;

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
