package com.example.mobinogi.entity.game;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "game_item")
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class GameItem{

	@Id
	@Column(name = "item_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field itemId.
	 */
	private Long itemId;

	@Column(name = "item_type", length = 30)
	/**
	 * Field itemType.
	 */
	private String itemType;

	@Column(name = "item_main_menu", length = 30)
	/**
	 * Field itemMainMenu.
	 */
	private String itemMainMenu;

	@Column(name = "item_sub_menu", length = 30)
	/**
	 * Field itemSubMenu.
	 */
	private String itemSubMenu;

	@Column(name = "item_rarity", length = 30)
	/**
	 * Field itemRarity.
	 */
	private String itemRarity;

	@Column(name = "item_name", length = 30, unique = true)
	/**
	 * Field itemName.
	 */
	private String itemName;

	@Column(name = "item_effect", columnDefinition = "TEXT")
	/**
	 * Field itemEffect.
	 */
	private String itemEffect;

	@Column(name = "item_transcendence", columnDefinition = "TEXT")
	/**
	 * Field itemTranscendence.
	 */
	private String itemTranscendence;

	@Column(name = "item_source", columnDefinition = "TEXT")
	/**
	 * Field itemSource.
	 */
	private String itemSource;

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

