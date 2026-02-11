package com.example.mobinogi.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "game_monster")
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class GameMonster{

	@Id
	@Column(name = "monster_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long monsterId;

	@Column(name = "region_id", columnDefinition = "BIGINT UNSIGNED")
	private Long regionId;

	@Column(name = "monster_type", length = 20)
	private String monsterType;

	@Column(name = "monster_difficulty", length = 20)
	private String monsterDifficulty;

	@Column(name = "monster_name", length = 100)
	private String monsterName;

	@Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
	private LocalDateTime createdAt;

	@Column(name = "updated_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
	private LocalDateTime updatedAt;

	@Column(name = "deleted_at", columnDefinition = "TIMESTAMP")
	private LocalDateTime deletedAt;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "region_id", insertable = false, updatable = false,
		foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
	private GameRegion gameRegion;

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
