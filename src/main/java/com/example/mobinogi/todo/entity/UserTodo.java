package com.example.mobinogi.todo.entity;

import com.example.mobinogi.entity.user.User;
import com.example.mobinogi.entity.user.UserCharacter;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * User TODO aggregate entity keyed by `(userId, characterId)`.
 */
@Entity
@Table(name = "user_todo")
@IdClass(UserTodoId.class)
@Getter
@Setter
@NoArgsConstructor
public class UserTodo{

	/** User ID (composite PK). */
	@Id
	@Column(name = "user_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field userId.
	 */
	private Long userId;

	/** Character ID (composite PK). */
	@Id
	@Column(name = "character_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field characterId.
	 */
	private Long characterId;

	/** JSON payload string. */
	@Column(name = "todo_data", columnDefinition = "JSON")
	/**
	 * Field todoData.
	 */
	private String todoData;

	/** Last daily-reset timestamp. */
	@Column(name = "last_daily_reset", columnDefinition = "TIMESTAMP")
	/**
	 * Field lastDailyReset.
	 */
	private LocalDateTime lastDailyReset;

	/** Last weekly-reset timestamp. */
	@Column(name = "last_weekly_reset", columnDefinition = "TIMESTAMP")
	/**
	 * Field lastWeeklyReset.
	 */
	private LocalDateTime lastWeeklyReset;

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

	/** Related user entity. */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", insertable = false, updatable = false)
	/**
	 * Field user.
	 */
	private User user;

	/** Related user-character entity. */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "character_id", insertable = false, updatable = false)
	/**
	 * Field character.
	 */
	private UserCharacter character;

	/**
	 * Initializes timestamps on insert.
	 */
	@PrePersist
	public void prePersist(){
		this.createdAt = LocalDateTime.now();
		this.updatedAt = LocalDateTime.now();
	}

	/**
	 * Updates timestamp on row update.
	 */
	@PreUpdate
	public void preUpdate(){
		this.updatedAt = LocalDateTime.now();
	}
}
