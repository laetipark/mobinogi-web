package com.example.mobinogi.controller.game;

import com.example.mobinogi.dto.game.GameItemDataDto;
import com.example.mobinogi.dto.game.GameItemFilterOptionsDto;
import com.example.mobinogi.dto.game.GameItemSummaryDto;
import com.example.mobinogi.service.game.GameItemService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/items")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@Slf4j
public class GameItemController{

	private final GameItemService gameItemService;

	public GameItemController(GameItemService gameItemService){
		this.gameItemService = gameItemService;
	}

	@GetMapping("/{itemName}/detail")
	public GameItemDataDto getItemDetail(@PathVariable String itemName){
		return gameItemService.getAllRelatedDataByItemName(itemName);
	}

	@GetMapping("/filters")
	public GameItemFilterOptionsDto getGameItemFilters(){
		return gameItemService.getGameItemFilterOptions();
	}

	// 페이지네이션으로 게임 아이템 목록 조회 API (물물교환/제작 요약 포함)
	@GetMapping
	public Page<GameItemSummaryDto> getGameItems(
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "10") int size,
		@RequestParam(defaultValue = "itemId") String sortBy,
		@RequestParam(defaultValue = "asc") String sortDir,
		@RequestParam(required = false) String keyword,
		@RequestParam(required = false) String itemType,
		@RequestParam(required = false) String itemRarity){

		List<String> itemRarities = (itemRarity == null || itemRarity.trim().isEmpty())
			? List.of()
			: Arrays.stream(itemRarity.split(","))
				.map(String::trim)
				.filter(value -> !value.isEmpty())
				.toList();

		log.info("🌐 API 호출: /items - page: {}, size: {}, sortBy: {}, sortDir: {}, keyword: {}, itemType: {}, itemRarity: {}",
			page, size, sortBy, sortDir, keyword, itemType, itemRarity);

		Page<GameItemSummaryDto> result = gameItemService.getGameItemsWithSummary(
			page,
			size,
			sortBy,
			sortDir,
			keyword,
			itemType,
			itemRarities
		);

		log.info("🌐 API 응답: 총 {}개 아이템, 현재 페이지 {}개 반환",
			result.getTotalElements(), result.getNumberOfElements());

		return result;
	}
}
