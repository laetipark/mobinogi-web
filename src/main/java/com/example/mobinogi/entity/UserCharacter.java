package com.example.mobinogi.entity;

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
	private Long characterId;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;
	
	@Column(name = "character_name", length = 100, nullable = false)
	private String characterName;
	
	@Column(name = "character_server", columnDefinition = "INT UNSIGNED")
	private Integer characterServer;
	
	@Column(name = "character_class", columnDefinition = "BIGINT UNSIGNED")
	private Long characterClass;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "character_class", referencedColumnName = "class_id", insertable = false, updatable = false)
	private GameClass gameClass;
	
	@Column(name = "character_order")
	private Integer characterOrder;
	
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
	}
	
	@PreUpdate
	protected void onUpdate(){
		updatedAt = LocalDateTime.now();
	}
}
