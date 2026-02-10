package com.example.mobinogi.service.game;

import com.example.mobinogi.entity.LifeBarter;
import com.example.mobinogi.repository.LifeBarterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GameBarterService{
	private final LifeBarterRepository lifeBarterRepository;
	
	public List<LifeBarter> getBartersByItemId(Long itemId){
		return lifeBarterRepository.findByItemId(itemId);
	}
	
	public List<LifeBarter> getBartersByExchangeId(Long itemId){
		return lifeBarterRepository.findByExchangeId(itemId);
	}
	
	public List<LifeBarter> getBartersByItemName(String itemName){
		return lifeBarterRepository.findByGameItem_ItemName(itemName);
	}
	
	public Page<LifeBarter> getBarters(int page, int size, String sortBy, String sortDir, String keyword){
		Sort sort = sortDir.equalsIgnoreCase("desc")
			? Sort.by(sortBy).descending()
			: Sort.by(sortBy).ascending();
		
		Pageable pageable = PageRequest.of(page, size, sort);
		
		if(keyword != null && !keyword.trim().isEmpty()){
			return lifeBarterRepository.findByKeyword(keyword.trim(), pageable);
		}
		
		return lifeBarterRepository.findAll(pageable);
	}
	
	public Page<LifeBarter> getBartersByObtainedItem(int page, int size, String sortBy, String sortDir, String keyword){
		return getBartersByObtainedItem(page, size, sortBy, sortDir, keyword, null);
	}
	
	public Page<LifeBarter> getBartersByObtainedItem(int page, int size, String sortBy, String sortDir, String keyword, Integer cycle){
		Sort sort = sortDir.equalsIgnoreCase("desc")
			? Sort.by(sortBy).descending()
			: Sort.by(sortBy).ascending();
		
		Pageable pageable = PageRequest.of(page, size, sort);
		
		if(keyword != null && !keyword.trim().isEmpty()){
			if(cycle != null){
				return lifeBarterRepository.findByItemNameKeywordAndCycle(keyword.trim(), cycle, pageable);
			}
			return lifeBarterRepository.findByItemNameKeyword(keyword.trim(), pageable);
		}
		
		if(cycle != null){
			return lifeBarterRepository.findByBarterInitCycle(cycle, pageable);
		}
		
		return lifeBarterRepository.findAll(pageable);
	}
}
