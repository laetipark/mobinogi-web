package com.example.mobinogi.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.sql.Timestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "life_barter")
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class LifeBarter{
	
	@Id
	@Column(name = "barter_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long barterId;

	@Column(name = "region_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long regionId;

	@Column(name = "npc_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long npcId;

	@Column(name = "item_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long itemId;
	
	@Column(name = "item_weight", nullable = false)
	private Integer itemWeight;
	
	@Column(name = "exchange_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long exchangeId;
	
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
	
	@Column(name = "barter_server")
	private Integer barterServer;

	@Column(name = "barter_npc")
	private Integer barterNpc;
	
	@Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
	private LocalDateTime createdAt;
	
	@Column(name = "updated_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
	private LocalDateTime updatedAt;
	
	@Column(name = "deleted_at", columnDefinition = "TIMESTAMP")
	private LocalDateTime deletedAt;
	
	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "region_id", insertable = false, updatable = false)
	private GameRegion gameRegion;
	
	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "npc_id", insertable = false, updatable = false)
	private GameNpc gameNpc;
	
	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "item_id", insertable = false, updatable = false)
	private GameItem gameItem;
	
	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "exchange_id", referencedColumnName = "item_id", insertable = false, updatable = false)
	private GameItem exchangeItem;
	
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
