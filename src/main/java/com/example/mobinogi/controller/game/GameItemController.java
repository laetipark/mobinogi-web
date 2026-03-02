package com.example.mobinogi.controller.game;

import com.example.mobinogi.dto.game.GameItemDataDto;
import com.example.mobinogi.dto.game.GameItemFilterOptionsDto;
import com.example.mobinogi.dto.game.GameItemSummaryDto;
import com.example.mobinogi.service.game.GameItemService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

/**
 * Game item API controller.
 */
@RestController
@RequestMapping("/api/items")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@Slf4j
public class GameItemController{

	/** Game item service. */
	private final GameItemService gameItemService;

	/**
	 * Initializes item controller.
	 *
	 * @param gameItemService item service
	 */
	public GameItemController(GameItemService gameItemService){
		this.gameItemService = gameItemService;
	}

	/**
	 * Returns detailed item payload by name.
	 *
	 * @param itemName item name
	 * @return item detail payload
	 */
	@GetMapping("/{itemName}/detail")
	public GameItemDataDto getItemDetail(@PathVariable String itemName){
		return gameItemService.getAllRelatedDataByItemName(itemName);
	}

	/**
	 * Returns item filter options.
	 *
	 * @return filter options payload
	 */
	@GetMapping("/filters")
	public GameItemFilterOptionsDto getGameItemFilters(){
		return gameItemService.getGameItemFilterOptions();
	}

	/**
	 * Returns paged item summaries including barter/craft summary data.
	 *
	 * @param page page index
	 * @param size page size
	 * @param sortBy sort field
	 * @param sortDir sort direction
	 * @param keyword keyword filter
	 * @param itemMainMenu main-menu filter
	 * @param itemSubMenu sub-menu filter
	 * @param itemType item-type filter
	 * @param itemRarity rarity filter (comma-separated)
	 * @return item summary page
	 */
	@GetMapping
	public Page<GameItemSummaryDto> getGameItems(
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "10") int size,
		@RequestParam(defaultValue = "itemRarity") String sortBy,
		@RequestParam(defaultValue = "desc") String sortDir,
		@RequestParam(required = false) String keyword,
		@RequestParam(required = false) String itemMainMenu,
		@RequestParam(required = false) String itemSubMenu,
		@RequestParam(required = false) String itemType,
		@RequestParam(required = false) String itemRarity
	){
		List<String> itemRarities = (itemRarity == null || itemRarity.trim().isEmpty())
			? List.of()
			: Arrays.stream(itemRarity.split(","))
				.map(String::trim)
				.filter(value -> !value.isEmpty())
				.toList();

		log.info("API call: /items - page: {}, size: {}, sortBy: {}, sortDir: {}, keyword: {}, itemType: {}, itemRarity: {}",
			page, size, sortBy, sortDir, keyword, itemType, itemRarity);

		Page<GameItemSummaryDto> result = gameItemService.getGameItemsWithSummary(
			page,
			size,
			sortBy,
			sortDir,
			keyword,
			itemMainMenu,
			itemSubMenu,
			itemType,
			itemRarities
		);

		log.info("API response: total {} items, current page elements {}",
			result.getTotalElements(), result.getNumberOfElements());

		return result;
	}
}
