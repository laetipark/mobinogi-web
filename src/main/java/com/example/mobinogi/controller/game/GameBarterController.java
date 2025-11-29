package com.example.mobinogi.controller.game;

import com.example.mobinogi.entity.LifeBarter;
import com.example.mobinogi.service.game.GameBarterService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/barter")
public class GameBarterController{
	
	private final GameBarterService gameBarterService;
	
	public GameBarterController(GameBarterService gameBarterService){
		this.gameBarterService = gameBarterService;
	}
	
	@RequestMapping(value = "/itemList.do", method = RequestMethod.GET)
	public List<LifeBarter> getBarterItemByItemName(@RequestParam String itemName){
		return gameBarterService.getBartersByItemName(itemName);
	}
}