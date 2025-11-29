package com.example.mobinogi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "life_craft")
@Setter
@Getter
public class LifeCraft{
	@Id
	@Column(name = "craft_id")
	private Integer craftId;
	
	@Column(name = "craft_sub_id")
	private Integer craftSubId;
	
	@Column(name = "item_id", nullable = false)
	private Integer itemId;
	
	@Column(name = "ingredient_id", nullable = false)
	private Integer craftIngredientId;
	
	@Column(name = "ingredient_cost", nullable = false)
	private Integer craftIngredientCost;
	
	@ManyToOne
	@JoinColumn(name = "item_id", insertable = false, updatable = false)
	private GameItem gameItem;
	
	@ManyToOne
	@JoinColumn(name = "ingredient_id", referencedColumnName = "item_id", insertable = false, updatable = false)
	private GameItem ingredientItem;
}
