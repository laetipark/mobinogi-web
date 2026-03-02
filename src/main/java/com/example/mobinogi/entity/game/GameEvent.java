package com.example.mobinogi.entity.game;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "game_event")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameEvent{
	
	@Id
	@Column(name = "event_id", nullable = false, length = 50)
	/**
	 * Field eventId.
	 */
	private String eventId;
	
	@Column(name = "thumbnail", length = 500)
	/**
	 * Field thumbnail.
	 */
	private String thumbnail;
	
	@Column(name = "title", nullable = false, length = 255)
	/**
	 * Field title.
	 */
	private String title;

	@Lob
	@Column(name = "content", columnDefinition = "LONGTEXT")
	/**
	 * Field content.
	 */
	private String content;
	
	@Column(name = "start_date")
	/**
	 * Field startDate.
	 */
	private LocalDateTime startDate;
	
	@Column(name = "end_date")
	/**
	 * Field endDate.
	 */
	private LocalDateTime endDate;
	
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

