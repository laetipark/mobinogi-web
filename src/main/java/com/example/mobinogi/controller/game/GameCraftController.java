package com.example.mobinogi.controller.game;

import com.example.mobinogi.entity.LifeCraft;
import com.example.mobinogi.service.game.GameCraftService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/craft")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@Slf4j
public class GameCraftController{

	private final GameCraftService gameCraftService;

	public GameCraftController(GameCraftService gameCraftService){
		this.gameCraftService = gameCraftService;
	}

	@GetMapping("/list")
	public Page<LifeCraft> getCrafts(
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "10") int size,
		@RequestParam(defaultValue = "craftId") String sortBy,
		@RequestParam(defaultValue = "asc") String sortDir,
		@RequestParam(required = false) String keyword){

		log.info("API 호출: /craft/list - page: {}, size: {}, sortBy: {}, sortDir: {}, keyword: {}",
			page, size, sortBy, sortDir, keyword);

		Page<LifeCraft> result = gameCraftService.getCrafts(page, size, sortBy, sortDir, keyword);

		log.info("API 응답: 총 {}개 제작, 현재 페이지 {}개 반환",
			result.getTotalElements(), result.getNumberOfElements());

		return result;
	}
}
