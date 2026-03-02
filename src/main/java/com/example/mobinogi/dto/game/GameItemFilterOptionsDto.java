package com.example.mobinogi.dto.game;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.AllArgsConstructor;

import java.util.List;

@Getter
@Setter
public class GameItemFilterOptionsDto{
	/**
	 * Field itemMainMenus.
	 */
	private List<String> itemMainMenus;
	/**
	 * Field itemSubMenus.
	 */
	private List<String> itemSubMenus;
	/**
	 * Field itemTypes.
	 */
	private List<String> itemTypes;
	/**
	 * Field itemRarities.
	 */
	private List<String> itemRarities;
	/**
	 * Field itemCategoryTree.
	 */
	private List<ItemMainMenuOptionDto> itemCategoryTree;

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	public static class ItemMainMenuOptionDto{
		/**
		 * Field itemMainMenu.
		 */
		private String itemMainMenu;
		/**
		 * Field subMenus.
		 */
		private List<ItemSubMenuOptionDto> subMenus;
	}

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	public static class ItemSubMenuOptionDto{
		/**
		 * Field itemSubMenu.
		 */
		private String itemSubMenu;
		/**
		 * Field itemTypes.
		 */
		private List<String> itemTypes;
	}
}
