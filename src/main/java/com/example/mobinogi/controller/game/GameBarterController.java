package com.example.mobinogi.controller.game;

import com.example.mobinogi.entity.LifeBarter;
import com.example.mobinogi.service.game.GameBarterService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/barter")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@Slf4j
public class GameBarterController{

	private final GameBarterService gameBarterService;

	public GameBarterController(GameBarterService gameBarterService){
		this.gameBarterService = gameBarterService;
	}

	@RequestMapping(value = "/barterItem", method = RequestMethod.GET)
	public List<LifeBarter> getBarterItemByItemName(@RequestParam String itemName){
		return gameBarterService.getBartersByItemName(itemName);
	}

	@GetMapping("/list")
	public Page<LifeBarter> getBarters(
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "10") int size,
		@RequestParam(defaultValue = "barterId") String sortBy,
		@RequestParam(defaultValue = "asc") String sortDir,
		@RequestParam(required = false) String keyword){

		log.info("API 호출: /barter/list - page: {}, size: {}, sortBy: {}, sortDir: {}, keyword: {}",
			page, size, sortBy, sortDir, keyword);

		Page<LifeBarter> result = gameBarterService.getBarters(page, size, sortBy, sortDir, keyword);

		log.info("API 응답: 총 {}개 물물교환, 현재 페이지 {}개 반환",
			result.getTotalElements(), result.getNumberOfElements());

		return result;
	}
}