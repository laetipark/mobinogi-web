package com.example.mobinogi.service.game;

import com.example.mobinogi.dto.game.GameItemDataDto;
import com.example.mobinogi.entity.GameItem;
import com.example.mobinogi.entity.LifeBarter;
import com.example.mobinogi.entity.LifeCraft;
import com.example.mobinogi.repository.GameItemRepository;
import com.example.mobinogi.repository.LifeBarterRepository;
import com.example.mobinogi.repository.LifeCraftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameItemService{
	private final GameItemRepository gameItemRepository;
	private final LifeBarterRepository lifeBarterRepository;
	private final LifeCraftRepository lifeCraftRepository;
	
	public GameItemDataDto getAllRelatedDataByItemName(String name){
		GameItem item = gameItemRepository.findByItemNameContaining(name)
			.stream()
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("Item not found"));
		int itemId = item.getItemId();
		String itemName = item.getItemName();
		
		List<LifeBarter> bartersByItemId = lifeBarterRepository.findByItemId(itemId);
		List<LifeBarter> bartersByExchangeId = lifeBarterRepository.findByExchangeId(itemId);
		List<LifeCraft> craftsByItemId = lifeCraftRepository.findByItemId(itemId);
		
		// ✅ 그룹화: craftSubId → LifeCraft 리스트
		Map<Integer, List<LifeCraft>> craftsGroupedBySubId = craftsByItemId.stream()
			.collect(Collectors.groupingBy(LifeCraft::getCraftSubId));
		
		GameItemDataDto dto = new GameItemDataDto();
		dto.setItemName(itemName);
		dto.setBartersByItemId(bartersByItemId);
		dto.setBartersByExchangeId(bartersByExchangeId);
		dto.setCraftsBySubId(craftsGroupedBySubId);
		return dto;
	}
	
	public void deleteGameItemSafely(int rowIndex){
		// 1. 관련된 life_barter 삭제
		lifeBarterRepository.deleteAllByItemId(rowIndex);
		lifeBarterRepository.deleteAllByExchangeId(rowIndex);
		
		// 2. 관련된 life_craft 삭제
		lifeCraftRepository.deleteAllByItemId(rowIndex);
		
		// ✅ rowIndex 이후의 기존 아이템 삭제
		gameItemRepository.deleteByItemIdGreaterThanEqual(rowIndex);
	}
	
	// 페이지네이션으로 게임 아이템 목록 조회
	public Page<GameItem> getGameItems(int page, int size, String sortBy, String sortDir, String keyword){
		log.info("🔍 GameItems 조회 시작 - page: {}, size: {}, sortBy: {}, sortDir: {}, keyword: {}",
			page, size, sortBy, sortDir, keyword);
		
		Sort sort = sortDir.equalsIgnoreCase("desc") ?
			Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
		
		Pageable pageable = PageRequest.of(page, size, sort);
		
		Page<GameItem> result;
		if(keyword != null && !keyword.trim().isEmpty()){
			result = gameItemRepository.findByItemNameContaining(keyword, pageable);
		}else{
			result = gameItemRepository.findAll(pageable);
		}
		
		// 📊 결과 로깅
		log.info("📊 조회 결과:");
		log.info("   - 총 요소 수: {}", result.getTotalElements());
		log.info("   - 총 페이지 수: {}", result.getTotalPages());
		log.info("   - 현재 페이지: {}", result.getNumber());
		log.info("   - 페이지 크기: {}", result.getSize());
		log.info("   - 현재 페이지 요소 수: {}", result.getNumberOfElements());
		log.info("   - 첫 번째 페이지 여부: {}", result.isFirst());
		log.info("   - 마지막 페이지 여부: {}", result.isLast());
		
		// 📋 실제 데이터 로깅 (처음 3개만)
		List<GameItem> items = result.getContent();
		log.info("📋 반환되는 아이템 데이터 (최대 3개):");
		for(int i = 0 ; i < Math.min(3, items.size()) ; i++){
			GameItem item = items.get(i);
			log.info("   {}. ID: {}, 이름: {}, 타입: {}, 등급: {}, 효과: {}",
				i + 1, item.getItemId(), item.getItemName(), item.getItemType(),
				item.getItemRarity(), item.getItemEffect());
		}
		
		if(items.size() > 3){
			log.info("   ... 그리고 {}개 더", items.size() - 3);
		}
		
		return result;
	}
}
