package com.example.mobinogi.service.game;

import com.example.mobinogi.entity.LifeCraft;
import com.example.mobinogi.repository.LifeCraftRepository;
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
public class GameCraftService{
	private final LifeCraftRepository lifeCraftRepository;

	public List<LifeCraft> getCraftsByItemId(Integer itemId){
		return lifeCraftRepository.findByItemId(itemId);
	}

	public Page<LifeCraft> getCrafts(int page, int size, String sortBy, String sortDir, String keyword){
		Sort sort = sortDir.equalsIgnoreCase("desc")
			? Sort.by(sortBy).descending()
			: Sort.by(sortBy).ascending();

		Pageable pageable = PageRequest.of(page, size, sort);

		if(keyword != null && !keyword.trim().isEmpty()){
			return lifeCraftRepository.findByKeyword(keyword.trim(), pageable);
		}

		return lifeCraftRepository.findAll(pageable);
	}
}
