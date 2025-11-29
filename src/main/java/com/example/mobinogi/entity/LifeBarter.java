package com.example.mobinogi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.sql.Timestamp;

@Entity
@Table(name = "life_barter")
@Getter
@Setter
@NoArgsConstructor
public class LifeBarter{
	
	@Id
	@Column(name = "barter_id", nullable = false)
	private Integer barterId;
	
	@Column(name = "region_id", nullable = false)
	private Integer regionId;
	
	@Column(name = "npc_id", nullable = false)
	private Integer npcId;
	
	@Column(name = "item_id", nullable = false)
	private Integer itemId;
	
	@Column(name = "item_weight", nullable = false)
	private Integer itemWeight;
	
	@Column(name = "exchange_id", nullable = false)
	private Integer exchangeId;
	
	@Column(name = "exchange_cost", nullable = false)
	private Integer exchangeCost;
	
	@Column(name = "barter_qty", nullable = false)
	private Integer barterQty;
	
	@Column(name = "barter_init_cycle")
	private Integer barterInitCycle;
	
	@Column(name = "barter_init_date")
	private Timestamp barterInitDate;
	
	@Column(name = "barter_init_day")
	private Byte barterInitDay;
	
	@Column(name = "barter_etc", length = 100)
	private String barterEtc;
	
	@ManyToOne
	@JoinColumn(name = "region_id", insertable = false, updatable = false)
	private GameRegion gameRegion;
	
	@ManyToOne
	@JoinColumn(name = "npc_id", insertable = false, updatable = false)
	private GameNpc gameNpc;
	
	@ManyToOne
	@JoinColumn(name = "item_id", insertable = false, updatable = false)
	private GameItem gameItem;
	
	@ManyToOne
	@JoinColumn(name = "exchange_id", referencedColumnName = "item_id", insertable = false, updatable = false)
	private GameItem exchangeItem;
}
