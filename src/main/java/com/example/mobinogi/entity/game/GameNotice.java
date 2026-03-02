package com.example.mobinogi.entity.game;

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
	/**
	 * Field noticeId.
	 */
	private String noticeId;

	@Column(name = "notice_type", nullable = false, length = 50)
	/**
	 * Field noticeType.
	 */
	private String noticeType;

	@Column(name = "title", nullable = false, length = 255)
	/**
	 * Field title.
	 */
	private String title;

	@Column(name = "published_date")
	/**
	 * Field publishedDate.
	 */
	private LocalDate publishedDate;

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

