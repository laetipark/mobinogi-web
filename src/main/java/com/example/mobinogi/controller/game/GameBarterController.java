package com.example.mobinogi.controller.game;

import com.example.mobinogi.dto.game.BarterFilterOptionsDto;
import com.example.mobinogi.entity.life.LifeBarter;
import com.example.mobinogi.service.game.GameBarterService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Barter lookup API controller.
 */
@RestController
@RequestMapping("/api/barter")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@Slf4j
public class GameBarterController{

	/** Barter query service. */
	private final GameBarterService gameBarterService;

	/**
	 * Initializes barter controller.
	 *
	 * @param gameBarterService barter service
	 */
	public GameBarterController(GameBarterService gameBarterService){
		this.gameBarterService = gameBarterService;
	}

	/**
	 * Returns barter rows by obtained item name.
	 *
	 * @param itemName obtained item name
	 * @return barter rows
	 */
	@RequestMapping(value = "/barterItem", method = RequestMethod.GET)
	public List<LifeBarter> getBarterItemByItemName(@RequestParam String itemName){
		return gameBarterService.getBartersByItemName(itemName);
	}

	/**
	 * Returns barter filter options.
	 *
	 * @return filter option payload
	 */
	@GetMapping("/filters")
	public BarterFilterOptionsDto getBarterFilters(){
		return gameBarterService.getBarterFilterOptions();
	}

	/**
	 * Returns paged barter list.
	 *
	 * @param page page index
	 * @param size page size
	 * @param sortBy sort field
	 * @param sortDir sort direction
	 * @param keyword keyword filter
	 * @param regionId region filter
	 * @param npcId NPC filter
	 * @param searchMode search mode
	 * @param cycle cycle filter
	 * @return page of barter rows
	 */
	@GetMapping("/list")
	public Page<LifeBarter> getBarters(
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "10") int size,
		@RequestParam(defaultValue = "barterId") String sortBy,
		@RequestParam(defaultValue = "asc") String sortDir,
		@RequestParam(required = false) String keyword,
		@RequestParam(required = false) Long regionId,
		@RequestParam(required = false) Long npcId,
		@RequestParam(defaultValue = "all") String searchMode,
		@RequestParam(required = false) Integer cycle
	){
		log.info("API call: /barter/list - page: {}, size: {}, sortBy: {}, sortDir: {}, keyword: {}, regionId: {}, npcId: {}, searchMode: {}, cycle: {}",
			page, size, sortBy, sortDir, keyword, regionId, npcId, searchMode, cycle);

		Page<LifeBarter> result;
		if("obtained".equals(searchMode)){
			result = gameBarterService.getBartersByObtainedItem(page, size, sortBy, sortDir, keyword, cycle);
		}else{
			result = gameBarterService.getBarters(page, size, sortBy, sortDir, keyword, regionId, npcId);
		}

		log.info("API response: total {} barters, current page elements {}",
			result.getTotalElements(), result.getNumberOfElements());

		return result;
	}
}
