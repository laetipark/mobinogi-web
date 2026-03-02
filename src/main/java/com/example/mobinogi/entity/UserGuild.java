package com.example.mobinogi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_guild")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGuild{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "guild_id", columnDefinition = "BIGINT UNSIGNED")
	private Long guildId;

	@Column(name = "guild_name", nullable = false, length = 120)
	private String guildName;

	@Column(name = "description", length = 500)
	private String description;

	@Column(name = "server_id", columnDefinition = "INT UNSIGNED")
	private Integer serverId;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "owner_user_id",
		nullable = false,
		foreignKey = @ForeignKey(name = "fk_user_guild_owner_user")
	)
	private User owner;

	@Column(name = "status", nullable = false, length = 20)
	private String status;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "reviewed_by",
		foreignKey = @ForeignKey(name = "fk_user_guild_reviewed_by")
	)
	private User reviewedBy;

	@Column(name = "reviewed_at")
	private LocalDateTime reviewedAt;

	@Column(name = "review_note", length = 500)
	private String reviewNote;

	@Column(name = "created_at", updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;

	@Column(name = "deleted_at")
	private LocalDateTime deletedAt;

	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
		updatedAt = LocalDateTime.now();
		if(status == null || status.isBlank()){
			status = "PENDING";
		}
	}

	@PreUpdate
	protected void onUpdate(){
		updatedAt = LocalDateTime.now();
	}
}
