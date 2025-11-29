package com.example.mobinogi.controller.game;

import com.example.mobinogi.dto.game.GameItemDataDto;
import com.example.mobinogi.service.game.GameItemService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/item")
public class GameItemController{
	
	private final GameItemService gameItemService;
	
	public GameItemController(GameItemService gameItemService){
		this.gameItemService = gameItemService;
	}
	
	@RequestMapping(value = "/itemUse.do", method = RequestMethod.GET)
	public GameItemDataDto getItemUseByItemName(@RequestParam String itemName){
		return this.gameItemService.getAllRelatedDataByItemName(itemName);
	}
}