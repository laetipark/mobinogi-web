package com.example.mobinogi.entity;

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
	@Column(name = "class_id", nullable = false)
	private Long classId;

	@Column(name = "class_code", nullable = false, length = 50)
	private String classCode;

	@Column(name = "class_name", nullable = false, length = 50)
	private String className;

	@Column(name = "is_apprentice", nullable = true, columnDefinition = "TINYINT(1) DEFAULT 0")
	private Boolean isApprentice;

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
	}

	@PreUpdate
	public void preUpdate(){
		this.updatedAt = LocalDateTime.now();
	}
}
