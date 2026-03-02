package com.example.mobinogi.entity.user;

import com.example.mobinogi.entity.game.GameClass;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_character")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCharacter{
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "character_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field characterId.
	 */
	private Long characterId;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "user_id",
		nullable = false,
		foreignKey = @ForeignKey(name = "fk_user_characters_user")
	)
	/**
	 * Field user.
	 */
	private User user;
	
	@Column(name = "character_name", length = 100, nullable = false)
	/**
	 * Field characterName.
	 */
	private String characterName;
	
	@Column(name = "character_server", columnDefinition = "INT UNSIGNED")
	/**
	 * Field characterServer.
	 */
	private Integer characterServer;
	
	@Column(name = "character_class", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field characterClass.
	 */
	private Long characterClass;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "character_class",
		referencedColumnName = "class_id",
		insertable = false,
		updatable = false,
		foreignKey = @ForeignKey(name = "FKpoo5uh6488wgynh15rgcr8xlp")
	)
	/**
	 * Field gameClass.
	 */
	private GameClass gameClass;
	
	@Column(name = "character_order")
	/**
	 * Field characterOrder.
	 */
	private Integer characterOrder;
	
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
	 * Initializes timestamps before insert.
	 */
	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
		updatedAt = LocalDateTime.now();
	}
	
	/**
	 * Updates timestamp before update.
	 */
	@PreUpdate
	protected void onUpdate(){
		updatedAt = LocalDateTime.now();
	}
}

