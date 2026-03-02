package com.example.mobinogi.entity.game;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "game_class")
@Getter
@Setter
public class GameClass{

	@Id
	@Column(name = "class_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field classId.
	 */
	private Long classId;

	@Column(name = "class_code", nullable = false, length = 50)
	/**
	 * Field classCode.
	 */
	private String classCode;

	@Column(name = "class_name", nullable = false, length = 50)
	/**
	 * Field className.
	 */
	private String className;

	@Column(name = "is_apprentice", nullable = true, columnDefinition = "TINYINT(1) DEFAULT 0")
	/**
	 * Field isApprentice.
	 */
	private Boolean isApprentice;

	@Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
	/**
	 * Field createdAt.
	 */
	private LocalDateTime createdAt;

	@Column(name = "updated_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
	/**
	 * Field updatedAt.
	 */
	private LocalDateTime updatedAt;

	@Column(name = "deleted_at", columnDefinition = "TIMESTAMP")
	/**
	 * Field deletedAt.
	 */
	private LocalDateTime deletedAt;

	/**
	 * Initializes timestamps before insert.
	 */
	@PrePersist
	public void prePersist(){
		this.createdAt = LocalDateTime.now();
		this.updatedAt = LocalDateTime.now();
	}

	/**
	 * Updates timestamp before update.
	 */
	@PreUpdate
	public void preUpdate(){
		this.updatedAt = LocalDateTime.now();
	}
}

