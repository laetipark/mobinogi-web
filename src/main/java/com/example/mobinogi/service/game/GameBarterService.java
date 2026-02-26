package com.example.mobinogi.service.game;

import com.example.mobinogi.dto.game.BarterFilterNpcDto;
import com.example.mobinogi.dto.game.BarterFilterOptionsDto;
import com.example.mobinogi.dto.game.BarterFilterRegionDto;
import com.example.mobinogi.entity.LifeBarter;
import com.example.mobinogi.repository.LifeBarterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
	
	public Page<LifeBarter> getBarters(
		int page,
		int size,
		String sortBy,
		String sortDir,
		String keyword,
		Long regionId,
		Long npcId){
		Sort sort = sortDir.equalsIgnoreCase("desc")
			? Sort.by(sortBy).descending()
			: Sort.by(sortBy).ascending();
		
		Pageable pageable = PageRequest.of(page, size, sort);

		String normalizedKeyword = (keyword != null && !keyword.trim().isEmpty())
			? keyword.trim()
			: null;

		return lifeBarterRepository.findByFilters(normalizedKeyword, regionId, npcId, pageable);
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

	public BarterFilterOptionsDto getBarterFilterOptions(){
		List<LifeBarterRepository.BarterFilterRow> rows = lifeBarterRepository.findFilterRows();
		Map<Long, BarterFilterRegionDto> regions = new LinkedHashMap<>();

		for(LifeBarterRepository.BarterFilterRow row : rows){
			if(row.getRegionId() == null){
				continue;
			}

			BarterFilterRegionDto region = regions.computeIfAbsent(
				row.getRegionId(),
				regionId -> new BarterFilterRegionDto(
					regionId,
					(row.getRegionName() == null || row.getRegionName().isBlank()) ? "미분류 지역" : row.getRegionName(),
					new ArrayList<>()
				)
			);

			if(row.getNpcId() == null){
				continue;
			}

			boolean exists = region.getNpcs().stream().anyMatch((npc) -> npc.getNpcId().equals(row.getNpcId()));
			if(!exists){
				region.getNpcs().add(
					new BarterFilterNpcDto(
						row.getNpcId(),
						(row.getNpcName() == null || row.getNpcName().isBlank()) ? "미분류 NPC" : row.getNpcName()
					)
				);
			}
		}

		return new BarterFilterOptionsDto(new ArrayList<>(regions.values()));
	}
}
