package com.example.mobinogi.dto.game;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.AllArgsConstructor;

import java.util.List;

@Getter
@Setter
public class GameItemFilterOptionsDto{
	private List<String> itemMainMenus;
	private List<String> itemSubMenus;
	private List<String> itemTypes;
	private List<String> itemRarities;
	private List<ItemMainMenuOptionDto> itemCategoryTree;

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	public static class ItemMainMenuOptionDto{
		private String itemMainMenu;
		private List<ItemSubMenuOptionDto> subMenus;
	}

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	public static class ItemSubMenuOptionDto{
		private String itemSubMenu;
		private List<String> itemTypes;
	}
}
