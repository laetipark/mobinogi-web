package com.example.mobinogi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_todo")
@IdClass(UserTodoId.class)
@Getter
@Setter
@NoArgsConstructor
public class UserTodo{

	@Id
	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Id
	@Column(name = "character_id", nullable = false)
	private Long characterId;

	@Column(name = "todo_data", columnDefinition = "JSON")
	private String todoData;

	@Column(name = "last_daily_reset", columnDefinition = "TIMESTAMP")
	private LocalDateTime lastDailyReset;

	@Column(name = "last_weekly_reset", columnDefinition = "TIMESTAMP")
	private LocalDateTime lastWeeklyReset;

	@Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
	private LocalDateTime createdAt;

	@Column(name = "updated_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
	private LocalDateTime updatedAt;

	@Column(name = "deleted_at", columnDefinition = "TIMESTAMP")
	private LocalDateTime deletedAt;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", insertable = false, updatable = false)
	private User user;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "character_id", insertable = false, updatable = false)
	private UserCharacter character;

	@PrePersist
	public void prePersist(){
		this.createdAt = LocalDateTime.now();
		this.updatedAt = LocalDateTime.now();
	}

	@PreUpdate
	public void preUpdate(){
		this.updatedAt = LocalDateTime.now();
	}
}
