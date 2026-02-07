package com.example.mobinogi.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notion_sync_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotionSyncLog{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "sync_id")
	private Long syncId;

	@Column(name = "last_sync_at", nullable = false)
	private LocalDateTime lastSyncAt;

	@Column(name = "sync_status", length = 20)
	private String syncStatus;

	@Column(name = "pages_synced")
	private Integer pagesSynced;

	@Column(name = "error_message", columnDefinition = "TEXT")
	private String errorMessage;

	@Column(name = "created_at", updatable = false)
	private LocalDateTime createdAt;

	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
	}
}
