package com.example.mobinogi.controller.game;

import com.example.mobinogi.dto.game.GameItemDataDto;
import com.example.mobinogi.entity.GameItem;
import com.example.mobinogi.service.game.GameItemService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/item")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@Slf4j
public class GameItemController{
	
	private final GameItemService gameItemService;
	
	public GameItemController(GameItemService gameItemService){
		this.gameItemService = gameItemService;
	}
	
	@RequestMapping(value = "/itemUse", method = RequestMethod.GET)
	public GameItemDataDto getItemUseByItemName(@RequestParam String itemName){
		return gameItemService.getAllRelatedDataByItemName(itemName);
	}
	
	// 페이지네이션으로 게임 아이템 목록 조회 API
	@GetMapping("/itemList")
	public Page<GameItem> getGameItems(
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "10") int size,
		@RequestParam(defaultValue = "itemId") String sortBy,
		@RequestParam(defaultValue = "asc") String sortDir,
		@RequestParam(required = false) String keyword){
		
		log.info("🌐 API 호출: /item/itemList - page: {}, size: {}, sortBy: {}, sortDir: {}, keyword: {}",
			page, size, sortBy, sortDir, keyword);
		
		Page<GameItem> result = gameItemService.getGameItems(page, size, sortBy, sortDir, keyword);
		
		log.info("🌐 API 응답: 총 {}개 아이템, 현재 페이지 {}개 반환",
			result.getTotalElements(), result.getNumberOfElements());
		
		return result;
	}
}