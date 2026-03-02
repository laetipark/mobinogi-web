package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.game.GameItem;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Game item list summary DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GameItemSummaryDto{

	/** Item ID. */
	private Long itemId;

	/** Item name. */
	private String itemName;

	/** Item type. */
	private String itemType;

	/** Main menu group. */
	private String itemMainMenu;

	/** Sub menu group. */
	private String itemSubMenu;

	/** Rarity text. */
	private String itemRarity;

	/** Effect text. */
	private String itemEffect;

	/** Transcendence text. */
	private String itemTranscendence;

	/** Source text. */
	private String itemSource;

	/** Whether item has barter acquisition source. */
	private boolean hasBarterSource;

	/** Barter source summary list. */
	private List<BarterSourceInfo> barterSources;

	/** Whether item has craft acquisition source. */
	private boolean hasCraftSource;

	/** Number of craft recipes for this item. */
	private int craftRecipeCount;

	/**
	 * Barter source summary payload.
	 */
	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	public static class BarterSourceInfo{

		/** Region name. */
		private String regionName;

		/** NPC name. */
		private String npcName;

		/** Exchange item name. */
		private String exchangeItemName;

		/** Exchange item cost. */
		private Integer exchangeCost;
	}

	/**
	 * Converts item entity to summary DTO.
	 *
	 * @param item item entity
	 * @return summary DTO
	 */
	public static GameItemSummaryDto fromEntity(GameItem item){
		GameItemSummaryDto dto = new GameItemSummaryDto();
		dto.setItemId(item.getItemId());
		dto.setItemName(item.getItemName());
		dto.setItemType(item.getItemType());
		dto.setItemMainMenu(item.getItemMainMenu());
		dto.setItemSubMenu(item.getItemSubMenu());
		dto.setItemRarity(item.getItemRarity());
		dto.setItemEffect(item.getItemEffect());
		dto.setItemTranscendence(item.getItemTranscendence());
		dto.setItemSource(item.getItemSource());
		return dto;
	}
}
