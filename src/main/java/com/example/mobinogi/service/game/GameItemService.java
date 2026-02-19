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
import org.springframework.data.domain.PageImpl;
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
		
		// Group crafts by craftSubId for response shape.
		Map<Integer, List<LifeCraft>> craftsGroupedBySubId = craftsByItemId.stream()
			.collect(Collectors.groupingBy(craft -> craft.getCraftSubId() == null ? 0 : craft.getCraftSubId()));
		
		GameItemDataDto dto = new GameItemDataDto();
		dto.setItemName(itemName);
		dto.setBartersByItemId(bartersByItemId);
		dto.setBartersByExchangeId(bartersByExchangeId);
		dto.setCraftsBySubId(craftsGroupedBySubId);
		return dto;
	}
	
	public void deleteGameItemSafely(Long rowIndex){
		// 1. Delete related life_barter rows first.
		lifeBarterRepository.deleteAllByItemId(rowIndex);
		lifeBarterRepository.deleteAllByExchangeId(rowIndex);
		
		// 2. Delete related life_craft rows.
		lifeCraftRepository.deleteAllByItemId(rowIndex);
		
		// 3. Delete game items at and after the target row index.
		gameItemRepository.deleteByItemIdGreaterThanEqual(rowIndex);
	}

	// Paginated game item query with barter/craft summary data.
	public Page<GameItemSummaryDto> getGameItemsWithSummary(
		int page,
		int size,
		String sortBy,
		String sortDir,
		String keyword,
		String itemType,
		List<String> itemRarities){
		log.info("GameItems query start - page: {}, size: {}, sortBy: {}, sortDir: {}, keyword: {}, itemType: {}, itemRarities: {}",
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
		List<GameItem> pageItems = result.getContent();
		List<Long> pageItemIds = pageItems.stream()
			.map(GameItem::getItemId)
			.toList();

		Map<Long, List<LifeBarter>> bartersByItemId = pageItemIds.isEmpty()
			? Map.of()
			: lifeBarterRepository.findByItemIdIn(pageItemIds)
				.stream()
				.collect(Collectors.groupingBy(LifeBarter::getItemId));

		Map<Long, List<LifeCraft>> craftsByItemId = pageItemIds.isEmpty()
			? Map.of()
			: lifeCraftRepository.findByItemIdIn(pageItemIds)
				.stream()
				.collect(Collectors.groupingBy(LifeCraft::getItemId));

		List<GameItemSummaryDto> summaryItems = pageItems.stream().map(item -> {
			GameItemSummaryDto dto = GameItemSummaryDto.fromEntity(item);
			List<LifeBarter> barters = bartersByItemId.getOrDefault(item.getItemId(), List.of());
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

			List<LifeCraft> crafts = craftsByItemId.getOrDefault(item.getItemId(), List.of());
			dto.setHasCraftSource(!crafts.isEmpty());
			dto.setCraftRecipeCount((int) crafts.stream()
				.map(craft -> craft.getCraftSubId() == null ? 0 : craft.getCraftSubId())
				.distinct()
				.count());

			return dto;
		}).toList();

		Page<GameItemSummaryDto> summaryPage = new PageImpl<>(summaryItems, pageable, result.getTotalElements());
		
		log.info("GameItems summary query done - total: {}, current page size: {}",
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
				case "\uC77C\uBC18":
				case "\uB178\uB9D0":
				case "\uACE0\uAE09":
				case "normal":
				case "common":
					expanded.add("\uC77C\uBC18");
					expanded.add("\uB178\uB9D0");
					expanded.add("\uACE0\uAE09");
					expanded.add("normal");
					expanded.add("common");
					break;
				case "\uB808\uC5B4":
				case "\uD76C\uADC0":
				case "rare":
					expanded.add("\uB808\uC5B4");
					expanded.add("\uD76C\uADC0");
					expanded.add("rare");
					break;
				case "\uC5D8\uB9AC\uD2B8":
				case "\uC601\uC6C5":
				case "elite":
					expanded.add("\uC5D8\uB9AC\uD2B8");
					expanded.add("\uC601\uC6C5");
					expanded.add("elite");
					break;
				case "\uC804\uC124":
				case "legendary":
					expanded.add("\uC804\uC124");
					expanded.add("legendary");
					break;
				case "\uC2E0\uD654":
				case "mythic":
					expanded.add("\uC2E0\uD654");
					expanded.add("mythic");
					break;
				case "\uC720\uB2C8\uD06C":
				case "unique":
					expanded.add("\uC720\uB2C8\uD06C");
					expanded.add("unique");
					break;
				case "\uC5D0\uD53D":
				case "epic":
					expanded.add("\uC5D0\uD53D");
					expanded.add("epic");
					break;
				default:
					if(rarity != null && !rarity.trim().isEmpty()){
						expanded.add(rarity.trim());
					}
					break;
			}
		}

		return expanded.stream().toList();
	}
}
