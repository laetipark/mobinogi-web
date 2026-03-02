package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.life.LifeBarter;
import com.example.mobinogi.entity.life.LifeCraft;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GameItemDataDto{
	/**
	 * Field itemName.
	 */
	private String itemName;
	/**
	 * Field itemType.
	 */
	private String itemType;
	/**
	 * Field itemMainMenu.
	 */
	private String itemMainMenu;
	/**
	 * Field itemSubMenu.
	 */
	private String itemSubMenu;
	/**
	 * Field itemRarity.
	 */
	private String itemRarity;
	/**
	 * Field itemEffect.
	 */
	private String itemEffect;
	/**
	 * Field itemTranscendence.
	 */
	private String itemTranscendence;
	/**
	 * Field itemSource.
	 */
	private String itemSource;
	/**
	 * Field bartersByItemId.
	 */
	private List<LifeBarter> bartersByItemId;
	/**
	 * Field bartersByExchangeId.
	 */
	private List<LifeBarter> bartersByExchangeId;
	/**
	 * Field craftsBySubId.
	 */
	private Map<Integer, List<LifeCraft>> craftsBySubId;
}
