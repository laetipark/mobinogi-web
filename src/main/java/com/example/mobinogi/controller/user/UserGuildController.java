package com.example.mobinogi.controller.user;

import com.example.mobinogi.service.user.UserGuildService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/guild")
public class UserGuildController{
	
	private final UserGuildService userGuildService;
	
	public UserGuildController(UserGuildService userGuildService){
		this.userGuildService = userGuildService;
	}
	
	@RequestMapping(value = "/members.do", method = RequestMethod.GET)
	public List<String> getBarterItemByItemName(@RequestParam String guildName) throws Exception{
		System.out.println("Item Name: " + guildName);
		return userGuildService.getGuildPlayersByName(guildName);
	}
}
