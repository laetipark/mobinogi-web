package com.example.mobinogi.service.game;

import com.example.mobinogi.entity.LifeBarter;
import com.example.mobinogi.repository.LifeBarterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GameBarterService{
	private final LifeBarterRepository lifeBarterRepository;
	
	public List<LifeBarter> getBartersByItemId(Integer itemId){
		return lifeBarterRepository.findByItemId(itemId);
	}
	
	public List<LifeBarter> getBartersByExchangeId(Integer itemId){
		return lifeBarterRepository.findByExchangeId(itemId);
	}
	
	public List<LifeBarter> getBartersByItemName(String itemName){
		return lifeBarterRepository.findByGameItem_ItemName(itemName);
	}
}
