package com.example.mobinogi.entity.life;

import com.example.mobinogi.entity.game.GameItem;
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
	/**
	 * Field craftId.
	 */
	private Long craftId;

	@Column(name = "item_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field itemId.
	 */
	private Long itemId;

	@Column(name = "craft_type", nullable = false, length = 30)
	/**
	 * Field craftType.
	 */
	private String craftType;

	@Column(name = "craft_name", nullable = false, length = 100)
	/**
	 * Field craftName.
	 */
	private String craftName;

	@Column(name = "item_name", nullable = false, length = 200)
	/**
	 * Field itemName.
	 */
	private String itemName;

	@Column(name = "ingredient_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field craftIngredientId.
	 */
	private Long craftIngredientId;

	@Column(name = "ingredient_name", nullable = false, length = 200)
	/**
	 * Field ingredientName.
	 */
	private String ingredientName;

	@Column(name = "ingredient_cost", nullable = false)
	/**
	 * Field craftIngredientCost.
	 */
	private Integer craftIngredientCost;
	
	@Column(name = "craftable_level")
	/**
	 * Field craftableLevel.
	 */
	private Integer craftableLevel;
	
	@Column(name = "processing_time")
	/**
	 * Field processingTime.
	 */
	private Integer processingTime;
	
	@Column(name = "craft_sub_id")
	/**
	 * Field craftSubId.
	 */
	private Integer craftSubId;

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

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "item_id", insertable = false, updatable = false,
		foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
	/**
	 * Field gameItem.
	 */
	private GameItem gameItem;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "ingredient_id", referencedColumnName = "item_id", insertable = false, updatable = false,
		foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
	/**
	 * Field ingredientItem.
	 */
	private GameItem ingredientItem;

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

