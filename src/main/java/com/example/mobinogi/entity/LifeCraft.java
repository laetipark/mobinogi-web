package com.example.mobinogi.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "life_craft")
@Setter
@Getter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class LifeCraft{

	@Id
	@Column(name = "craft_id", columnDefinition = "BIGINT UNSIGNED")
	private Long craftId;

	@Column(name = "item_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long itemId;

	@Column(name = "craft_type", nullable = false, length = 30)
	private String craftType;

	@Column(name = "craft_name", nullable = false, length = 100)
	private String craftName;

	@Column(name = "item_name", nullable = false, length = 200)
	private String itemName;

	@Column(name = "ingredient_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long craftIngredientId;

	@Column(name = "ingredient_name", nullable = false, length = 200)
	private String ingredientName;

	@Column(name = "ingredient_cost", nullable = false)
	private Integer craftIngredientCost;
	
	@Column(name = "craftable_level")
	private Integer craftableLevel;
	
	@Column(name = "processing_time")
	private Integer processingTime;
	
	@Column(name = "craft_sub_id")
	private Integer craftSubId;

	@Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
	private LocalDateTime createdAt;

	@Column(name = "updated_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
	private LocalDateTime updatedAt;

	@Column(name = "deleted_at", columnDefinition = "TIMESTAMP")
	private LocalDateTime deletedAt;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "item_id", insertable = false, updatable = false,
		foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
	private GameItem gameItem;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "ingredient_id", referencedColumnName = "item_id", insertable = false, updatable = false,
		foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
	private GameItem ingredientItem;

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
