package com.example.mobinogi.service.game;

import com.example.mobinogi.dto.game.GameItemDataDto;
import com.example.mobinogi.dto.game.GameItemFilterOptionsDto;
import com.example.mobinogi.entity.GameItem;
import com.example.mobinogi.entity.LifeBarter;
import com.example.mobinogi.entity.LifeCraft;
import com.example.mobinogi.repository.GameItemRepository;
import com.example.mobinogi.repository.LifeBarterRepository;
import com.example.mobinogi.repository.LifeCraftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
	public Page<GameItemSummaryDto> getGameItemsWithSummary(
		int page,
		int size,
		String sortBy,
		String sortDir,
		String keyword,
		String itemType,
		List<String> itemRarities){
		log.info("🔍 GameItems 조회 시작 - page: {}, size: {}, sortBy: {}, sortDir: {}, keyword: {}, itemType: {}, itemRarities: {}",
			page, size, sortBy, sortDir, keyword, itemType, itemRarities);

		Sort sort = sortDir.equalsIgnoreCase("desc") ?
			Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();

		Pageable pageable = PageRequest.of(page, size, sort);

		List<String> normalizedRarities = itemRarities == null
			? List.of()
			: itemRarities.stream()
				.filter(StringUtils::hasText)
				.map(String::trim)
				.distinct()
				.toList();
		List<String> expandedRarityFilters = expandRarityFilters(normalizedRarities);

		Specification<GameItem> specification = (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();

			if(StringUtils.hasText(keyword)){
				predicates.add(cb.like(root.get("itemName"), "%" + keyword.trim() + "%"));
			}

			if(StringUtils.hasText(itemType)){
				predicates.add(cb.equal(root.get("itemType"), itemType.trim()));
			}

			if(!expandedRarityFilters.isEmpty()){
				predicates.add(root.get("itemRarity").in(expandedRarityFilters));
			}

			return cb.and(predicates.toArray(new Predicate[0]));
		};

		Page<GameItem> result = gameItemRepository.findAll(specification, pageable);
		
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

	public GameItemFilterOptionsDto getGameItemFilterOptions(){
		GameItemFilterOptionsDto dto = new GameItemFilterOptionsDto();
		dto.setItemTypes(gameItemRepository.findDistinctItemTypes());
		dto.setItemRarities(gameItemRepository.findDistinctItemRarities());
		return dto;
	}

	private List<String> expandRarityFilters(List<String> rarities){
		if(rarities == null || rarities.isEmpty()){
			return List.of();
		}

		Set<String> expanded = new LinkedHashSet<>();
		for(String rarity : rarities){
			String normalized = rarity == null ? "" : rarity.trim().toLowerCase();
			switch(normalized){
				case "일반":
				case "노말":
				case "normal":
				case "common":
					expanded.add("일반");
					expanded.add("노말");
					expanded.add("normal");
					expanded.add("common");
					break;
				case "레어":
				case "희귀":
				case "rare":
					expanded.add("레어");
					expanded.add("희귀");
					expanded.add("rare");
					break;
				case "엘리트":
				case "영웅":
				case "elite":
					expanded.add("엘리트");
					expanded.add("영웅");
					expanded.add("elite");
					break;
				case "전설":
				case "legendary":
					expanded.add("전설");
					expanded.add("legendary");
					break;
				case "신화":
				case "mythic":
					expanded.add("신화");
					expanded.add("mythic");
					break;
				case "유니크":
				case "unique":
					expanded.add("유니크");
					expanded.add("unique");
					break;
				case "에픽":
				case "epic":
					expanded.add("에픽");
					expanded.add("epic");
					break;
				case "고급":
					expanded.add("고급");
					break;
				default:
					expanded.add(rarity);
					break;
			}
		}

		return expanded.stream().toList();
	}
}
