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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.example.mobinogi.dto.game.GameItemSummaryDto;

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
		Long itemId = item.getItemId();
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
	
	public void deleteGameItemSafely(Long rowIndex){
		// 1. 관련된 life_barter 삭제
		lifeBarterRepository.deleteAllByItemId(rowIndex);
		lifeBarterRepository.deleteAllByExchangeId(rowIndex);
		
		// 2. 관련된 life_craft 삭제
		lifeCraftRepository.deleteAllByItemId(rowIndex);
		
		// ✅ rowIndex 이후의 기존 아이템 삭제
		gameItemRepository.deleteByItemIdGreaterThanEqual(rowIndex);
	}
	
	// 페이지네이션으로 게임 아이템 목록 조회 (요약 정보 포함)
	public Page<GameItemSummaryDto> getGameItemsWithSummary(int page, int size, String sortBy, String sortDir, String keyword){
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
		
		// GameItem을 GameItemSummaryDto로 변환하면서 물물교환/제작 정보 추가
		Page<GameItemSummaryDto> summaryPage = result.map(item -> {
			GameItemSummaryDto dto = GameItemSummaryDto.fromEntity(item);
			
			// 물물교환 정보 조회 (이 아이템을 획득할 수 있는 물물교환)
			List<LifeBarter> barters = lifeBarterRepository.findByItemId(item.getItemId());
			dto.setHasBarterSource(!barters.isEmpty());
			
			if(!barters.isEmpty()){
				List<GameItemSummaryDto.BarterSourceInfo> barterSources = new ArrayList<>();
				for(LifeBarter barter : barters){
					GameItemSummaryDto.BarterSourceInfo info = new GameItemSummaryDto.BarterSourceInfo();
					info.setRegionName(barter.getGameRegion() != null ? barter.getGameRegion().getRegionName() : null);
					info.setNpcName(barter.getGameNpc() != null ? barter.getGameNpc().getNpcName() : null);
					info.setExchangeItemName(barter.getExchangeItem() != null ? barter.getExchangeItem().getItemName() : null);
					info.setExchangeCost(barter.getExchangeCost());
					barterSources.add(info);
				}
				dto.setBarterSources(barterSources);
			}
			
			// 제작 정보 조회 (이 아이템을 제작할 수 있는지)
			List<LifeCraft> crafts = lifeCraftRepository.findByItemId(item.getItemId());
			dto.setHasCraftSource(!crafts.isEmpty());
			dto.setCraftRecipeCount((int) crafts.stream().map(LifeCraft::getCraftSubId).distinct().count());
			
			return dto;
		});
		
		log.info("📊 조회 결과: 총 {}개 아이템, 현재 페이지 {}개",
			summaryPage.getTotalElements(), summaryPage.getNumberOfElements());
		
		return summaryPage;
	}
}
