package com.example.mobinogi.service.game;

import com.example.mobinogi.entity.LifeCraft;
import com.example.mobinogi.repository.LifeCraftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GameCraftService{
	private final LifeCraftRepository lifeCraftRepository;
	
	public List<LifeCraft> getCraftsByItemId(Integer itemId){
		return lifeCraftRepository.findByItemId(itemId);
	}
}
