package com.example.mobinogi.controller.game;

import com.example.mobinogi.dto.game.CraftFilterOptionsDto;
import com.example.mobinogi.entity.life.LifeCraft;
import com.example.mobinogi.service.game.GameCraftService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Craft lookup API controller.
 */
@RestController
@RequestMapping("/api/craft")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@Slf4j
public class GameCraftController{

	/** Craft query service. */
	private final GameCraftService gameCraftService;

	/**
	 * Initializes craft controller.
	 *
	 * @param gameCraftService craft service
	 */
	public GameCraftController(GameCraftService gameCraftService){
		this.gameCraftService = gameCraftService;
	}

	/**
	 * Returns craft filter options.
	 *
	 * @return filter options
	 */
	@GetMapping("/filters")
	public CraftFilterOptionsDto getCraftFilters(){
		return gameCraftService.getCraftFilterOptions();
	}

	/**
	 * Returns paged craft rows.
	 *
	 * @param page page index
	 * @param size page size
	 * @param sortBy sort field
	 * @param sortDir sort direction
	 * @param keyword keyword filter
	 * @param craftType craft type filter
	 * @param craftName craft name filter
	 * @return craft page
	 */
	@GetMapping("/list")
	public Page<LifeCraft> getCrafts(
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "10") int size,
		@RequestParam(defaultValue = "craftId") String sortBy,
		@RequestParam(defaultValue = "asc") String sortDir,
		@RequestParam(required = false) String keyword,
		@RequestParam(required = false) String craftType,
		@RequestParam(required = false) String craftName
	){
		log.info("API call: /craft/list - page: {}, size: {}, sortBy: {}, sortDir: {}, keyword: {}, craftType: {}, craftName: {}",
			page, size, sortBy, sortDir, keyword, craftType, craftName);

		Page<LifeCraft> result = gameCraftService.getCrafts(page, size, sortBy, sortDir, keyword, craftType, craftName);

		log.info("API response: total {} crafts, current page elements {}",
			result.getTotalElements(), result.getNumberOfElements());

		return result;
	}
}
