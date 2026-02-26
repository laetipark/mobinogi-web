package com.example.mobinogi.entity;

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
	private Long itemId;

	@Column(name = "item_type", length = 30)
	private String itemType;

	@Column(name = "item_main_menu", length = 30)
	private String itemMainMenu;

	@Column(name = "item_sub_menu", length = 30)
	private String itemSubMenu;

	@Column(name = "item_rarity", length = 30)
	private String itemRarity;

	@Column(name = "item_name", length = 30, unique = true)
	private String itemName;

	@Column(name = "item_effect", columnDefinition = "TEXT")
	private String itemEffect;

	@Column(name = "item_transcendence", columnDefinition = "TEXT")
	private String itemTranscendence;

	@Column(name = "item_source", columnDefinition = "TEXT")
	private String itemSource;

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
