package com.example.mobinogi.entity;

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
	private String eventId;
	
	@Column(name = "thumbnail", length = 500)
	private String thumbnail;
	
	@Column(name = "title", nullable = false, length = 255)
	private String title;
	
	@Column(name = "start_date")
	private LocalDateTime startDate;
	
	@Column(name = "end_date")
	private LocalDateTime endDate;
	
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
