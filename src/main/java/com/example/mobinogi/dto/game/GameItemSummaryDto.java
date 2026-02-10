package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.GameItem;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GameItemSummaryDto{
	private Long itemId;
	private String itemName;
	private String itemType;
	private String itemRarity;
	private String itemEffect;

	// 물물교환 요약 정보
	private boolean hasBarterSource;  // 물물교환으로 획득 가능한지
	private List<BarterSourceInfo> barterSources;  // 획득 가능한 물물교환 정보

	// 제작 요약 정보
	private boolean hasCraftSource;  // 제작으로 획득 가능한지
	private int craftRecipeCount;  // 제작 레시피 수

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	public static class BarterSourceInfo{
		private String regionName;
		private String npcName;
		private String exchangeItemName;
		private Integer exchangeCost;
	}

	public static GameItemSummaryDto fromEntity(GameItem item){
		GameItemSummaryDto dto = new GameItemSummaryDto();
		dto.setItemId(item.getItemId());
		dto.setItemName(item.getItemName());
		dto.setItemType(item.getItemType());
		dto.setItemRarity(item.getItemRarity());
		dto.setItemEffect(item.getItemEffect());
		return dto;
	}
}
