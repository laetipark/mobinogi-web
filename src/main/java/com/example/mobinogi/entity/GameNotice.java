package com.example.mobinogi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "game_notice")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameNotice{

	@Id
	@Column(name = "notice_id", nullable = false, length = 50)
	private String noticeId;

	@Column(name = "notice_type", nullable = false, length = 50)
	private String noticeType;

	@Column(name = "title", nullable = false, length = 255)
	private String title;

	@Column(name = "published_date")
	private LocalDate publishedDate;

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
