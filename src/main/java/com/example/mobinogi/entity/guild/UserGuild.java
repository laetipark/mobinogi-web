package com.example.mobinogi.entity.guild;

import com.example.mobinogi.entity.user.User;
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
	/**
	 * Field guildId.
	 */
	private Long guildId;

	@Column(name = "guild_name", nullable = false, length = 120)
	/**
	 * Field guildName.
	 */
	private String guildName;

	@Column(name = "description", length = 500)
	/**
	 * Field description.
	 */
	private String description;

	@Column(name = "server_id", columnDefinition = "INT UNSIGNED")
	/**
	 * Field serverId.
	 */
	private Integer serverId;

	@Column(name = "guild_level", columnDefinition = "INT UNSIGNED")
	/**
	 * Field guildLevel.
	 */
	private Integer guildLevel;

	@Column(name = "level")
	/**
	 * Field level.
	 */
	private Integer level;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "owner_user_id",
		nullable = false,
		foreignKey = @ForeignKey(name = "fk_user_guild_owner_user")
	)
	/**
	 * Field owner.
	 */
	private User owner;

	@Column(name = "status", nullable = false, length = 20)
	/**
	 * Field status.
	 */
	private String status;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "reviewed_by",
		foreignKey = @ForeignKey(name = "fk_user_guild_reviewed_by")
	)
	/**
	 * Field reviewedBy.
	 */
	private User reviewedBy;

	@Column(name = "reviewed_at")
	/**
	 * Field reviewedAt.
	 */
	private LocalDateTime reviewedAt;

	@Column(name = "review_note", length = 500)
	/**
	 * Field reviewNote.
	 */
	private String reviewNote;

	@Column(name = "created_at", updatable = false)
	/**
	 * Field createdAt.
	 */
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	/**
	 * Field updatedAt.
	 */
	private LocalDateTime updatedAt;

	@Column(name = "deleted_at")
	/**
	 * Field deletedAt.
	 */
	private LocalDateTime deletedAt;

	/**
	 * Initializes default values before insert.
	 */
	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
		updatedAt = LocalDateTime.now();
		if(status == null || status.isBlank()){
			status = "PENDING";
		}
		if(level == null){
			level = 0;
		}
	}

	/**
	 * Updates timestamp before update.
	 */
	@PreUpdate
	protected void onUpdate(){
		updatedAt = LocalDateTime.now();
	}
}

