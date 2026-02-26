package com.example.mobinogi.service.game;

import com.example.mobinogi.dto.game.CraftFilterOptionsDto;
import com.example.mobinogi.dto.game.CraftFilterTypeDto;
import com.example.mobinogi.entity.LifeCraft;
import com.example.mobinogi.repository.LifeCraftRepository;
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
public class GameCraftService{
	private final LifeCraftRepository lifeCraftRepository;

	public List<LifeCraft> getCraftsByItemId(Long itemId){
		return lifeCraftRepository.findByItemId(itemId);
	}

	public Page<LifeCraft> getCrafts(
		int page,
		int size,
		String sortBy,
		String sortDir,
		String keyword,
		String craftType,
		String craftName){
		Sort sort = sortDir.equalsIgnoreCase("desc")
			? Sort.by(sortBy).descending()
			: Sort.by(sortBy).ascending();

		Pageable pageable = PageRequest.of(page, size, sort);

		String normalizedKeyword = (keyword != null && !keyword.trim().isEmpty())
			? keyword.trim()
			: null;
		String normalizedCraftType = (craftType != null && !craftType.trim().isEmpty())
			? craftType.trim()
			: null;
		String normalizedCraftName = (craftName != null && !craftName.trim().isEmpty())
			? craftName.trim()
			: null;

		return lifeCraftRepository.findByFilters(normalizedKeyword, normalizedCraftType, normalizedCraftName, pageable);
	}

	public CraftFilterOptionsDto getCraftFilterOptions(){
		List<LifeCraftRepository.CraftFilterRow> rows = lifeCraftRepository.findFilterRows();
		Map<String, CraftFilterTypeDto> grouped = new LinkedHashMap<>();

		for(LifeCraftRepository.CraftFilterRow row : rows){
			String type = (row.getCraftType() == null || row.getCraftType().isBlank()) ? "미분류" : row.getCraftType();
			String name = (row.getCraftName() == null || row.getCraftName().isBlank()) ? "미분류" : row.getCraftName();

			CraftFilterTypeDto entry = grouped.computeIfAbsent(type, (key) -> new CraftFilterTypeDto(key, new ArrayList<>()));
			if(!entry.getCraftNames().contains(name)){
				entry.getCraftNames().add(name);
			}
		}

		return new CraftFilterOptionsDto(new ArrayList<>(grouped.values()));
	}
}
