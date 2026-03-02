package com.example.mobinogi.entity.life;

import com.example.mobinogi.entity.game.GameItem;
import com.example.mobinogi.entity.game.GameNpc;
import com.example.mobinogi.entity.game.GameRegion;
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
	/**
	 * Field barterId.
	 */
	private Long barterId;

	@Column(name = "region_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field regionId.
	 */
	private Long regionId;

	@Column(name = "npc_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field npcId.
	 */
	private Long npcId;

	@Column(name = "item_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field itemId.
	 */
	private Long itemId;
	
	@Column(name = "item_weight", nullable = false)
	/**
	 * Field itemWeight.
	 */
	private Integer itemWeight;
	
	@Column(name = "exchange_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field exchangeId.
	 */
	private Long exchangeId;
	
	@Column(name = "exchange_cost", nullable = false)
	/**
	 * Field exchangeCost.
	 */
	private Integer exchangeCost;
	
	@Column(name = "barter_qty", nullable = false)
	/**
	 * Field barterQty.
	 */
	private Integer barterQty;
	
	@Column(name = "barter_init_cycle")
	/**
	 * Field barterInitCycle.
	 */
	private Integer barterInitCycle;
	
	@Column(name = "barter_init_date")
	/**
	 * Field barterInitDate.
	 */
	private Timestamp barterInitDate;
	
	@Column(name = "barter_init_day")
	/**
	 * Field barterInitDay.
	 */
	private Byte barterInitDay;
	
	@Column(name = "barter_server")
	/**
	 * Field barterServer.
	 */
	private Integer barterServer;

	@Column(name = "barter_npc")
	/**
	 * Field barterNpc.
	 */
	private Integer barterNpc;
	
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
	@JoinColumn(name = "region_id", insertable = false, updatable = false,
		foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
	/**
	 * Field gameRegion.
	 */
	private GameRegion gameRegion;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "npc_id", insertable = false, updatable = false,
		foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
	/**
	 * Field gameNpc.
	 */
	private GameNpc gameNpc;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "item_id", insertable = false, updatable = false,
		foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
	/**
	 * Field gameItem.
	 */
	private GameItem gameItem;

	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "exchange_id", referencedColumnName = "item_id", insertable = false, updatable = false,
		foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
	/**
	 * Field exchangeItem.
	 */
	private GameItem exchangeItem;

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

