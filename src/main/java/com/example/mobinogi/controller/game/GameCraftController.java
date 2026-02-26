package com.example.mobinogi.controller.game;

import com.example.mobinogi.dto.game.CraftFilterOptionsDto;
import com.example.mobinogi.entity.LifeCraft;
import com.example.mobinogi.service.game.GameCraftService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/craft")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@Slf4j
public class GameCraftController{

	private final GameCraftService gameCraftService;

	public GameCraftController(GameCraftService gameCraftService){
		this.gameCraftService = gameCraftService;
	}

	@GetMapping("/filters")
	public CraftFilterOptionsDto getCraftFilters(){
		return gameCraftService.getCraftFilterOptions();
	}

	@GetMapping("/list")
	public Page<LifeCraft> getCrafts(
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "10") int size,
		@RequestParam(defaultValue = "craftId") String sortBy,
		@RequestParam(defaultValue = "asc") String sortDir,
		@RequestParam(required = false) String keyword,
		@RequestParam(required = false) String craftType,
		@RequestParam(required = false) String craftName){

		log.info("API call: /craft/list - page: {}, size: {}, sortBy: {}, sortDir: {}, keyword: {}, craftType: {}, craftName: {}",
			page, size, sortBy, sortDir, keyword, craftType, craftName);

		Page<LifeCraft> result = gameCraftService.getCrafts(page, size, sortBy, sortDir, keyword, craftType, craftName);

		log.info("API response: total {} crafts, current page elements {}",
			result.getTotalElements(), result.getNumberOfElements());

		return result;
	}
}