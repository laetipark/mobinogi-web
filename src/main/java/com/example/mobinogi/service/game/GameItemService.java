package com.example.mobinogi.service.game;

import com.example.mobinogi.dto.game.GameItemDataDto;
import com.example.mobinogi.dto.game.GameItemFilterOptionsDto;
import com.example.mobinogi.entity.game.GameItem;
import com.example.mobinogi.entity.life.LifeBarter;
import com.example.mobinogi.entity.life.LifeCraft;
import com.example.mobinogi.repository.GameItemRepository;
import com.example.mobinogi.repository.LifeBarterRepository;
import com.example.mobinogi.repository.LifeCraftRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
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
	/** Game item repository. */
	private final GameItemRepository gameItemRepository;

	/** Barter repository for item relation lookup. */
	private final LifeBarterRepository lifeBarterRepository;

	/** Craft repository for item relation lookup. */
	private final LifeCraftRepository lifeCraftRepository;

	/**
	 * Returns a detailed item payload with barter and craft relations.
	 *
	 * @param name item name
	 * @return aggregated item detail payload
	 */
	public GameItemDataDto getAllRelatedDataByItemName(String name){
		String normalizedName = name == null ? "" : name.trim();
		List<GameItem> exactMatchItems = gameItemRepository.findAllByItemNameOrderByItemIdAsc(normalizedName);
		if(exactMatchItems.size() > 1){
			log.warn("Duplicate item_name matched detail route - itemName: {}, matchCount: {}, selectedItemId: {}",
				normalizedName,
				exactMatchItems.size(),
				exactMatchItems.getFirst().getItemId());
		}

		GameItem item = exactMatchItems.stream()
			.findFirst()
			.orElseGet(() -> gameItemRepository.findByItemNameContaining(normalizedName)
				.stream()
				.findFirst()
				.orElse(null));
		if(item == null){
			throw new IllegalArgumentException("Item not found");
		}
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
		dto.setItemType(item.getItemType());
		dto.setItemMainMenu(item.getItemMainMenu());
		dto.setItemSubMenu(item.getItemSubMenu());
		dto.setItemRarity(item.getItemRarity());
		dto.setItemEffect(item.getItemEffect());
		dto.setItemTranscendence(item.getItemTranscendence());
		dto.setItemSource(item.getItemSource());
		dto.setBartersByItemId(bartersByItemId);
		dto.setBartersByExchangeId(bartersByExchangeId);
		dto.setCraftsBySubId(craftsGroupedBySubId);
		return dto;
	}

	/**
	 * Deletes an item row and dependent records by row index.
	 *
	 * @param rowIndex target row index
	 */
	public void deleteGameItemSafely(Long rowIndex){
		// 1. Delete related life_barter rows first.
		lifeBarterRepository.deleteAllByItemId(rowIndex);
		lifeBarterRepository.deleteAllByExchangeId(rowIndex);
		
		// 2. Delete related life_craft rows.
		lifeCraftRepository.deleteAllByItemId(rowIndex);
		
		// 3. Delete game items at and after the target row index.
		gameItemRepository.deleteByItemIdGreaterThanEqual(rowIndex);
	}

	/**
	 * Returns paged items with barter/craft summary metadata.
	 *
	 * @param page page index
	 * @param size page size
	 * @param sortBy sort field
	 * @param sortDir sort direction
	 * @param keyword keyword filter
	 * @param itemMainMenu main menu filter
	 * @param itemSubMenu sub menu filter
	 * @param itemType item type filter
	 * @param itemRarities rarity filters
	 * @return paged item summaries
	 */
	public Page<GameItemSummaryDto> getGameItemsWithSummary(
		int page,
		int size,
		String sortBy,
		String sortDir,
		String keyword,
		String itemMainMenu,
		String itemSubMenu,
		String itemType,
		List<String> itemRarities){
		log.info("GameItems query start - page: {}, size: {}, sortBy: {}, sortDir: {}, keyword: {}, itemMainMenu: {}, itemSubMenu: {}, itemType: {}, itemRarities: {}",
			page, size, sortBy, sortDir, keyword, itemMainMenu, itemSubMenu, itemType, itemRarities);

		String normalizedSortBy = StringUtils.hasText(sortBy) ? sortBy.trim() : "itemRarity";
		String normalizedSortDir = StringUtils.hasText(sortDir)
			? sortDir.trim()
			: ("itemRarity".equals(normalizedSortBy) ? "desc" : "asc");
		Sort.Direction direction = "desc".equalsIgnoreCase(normalizedSortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;
		boolean useMenuAwareSort = isMenuAwareSort(normalizedSortBy);
		boolean useRarityAwareSort = isRarityAwareSort(normalizedSortBy);
		Pageable queryPageable = PageRequest.of(page, size, (useMenuAwareSort || useRarityAwareSort) ? Sort.unsorted() : buildSimpleSort(normalizedSortBy, direction));
		Pageable responsePageable = PageRequest.of(page, size, buildSimpleSort(normalizedSortBy, direction));

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

			if(StringUtils.hasText(itemMainMenu)){
				predicates.add(cb.equal(root.get("itemMainMenu"), itemMainMenu.trim()));
			}

			if(StringUtils.hasText(itemSubMenu)){
				predicates.add(cb.equal(root.get("itemSubMenu"), itemSubMenu.trim()));
			}

			if(StringUtils.hasText(itemType)){
				predicates.add(cb.equal(root.get("itemType"), itemType.trim()));
			}

			if(!expandedRarityFilters.isEmpty()){
				predicates.add(root.get("itemRarity").in(expandedRarityFilters));
			}

			if(query != null && !isCountQuery(query)){
				if(useMenuAwareSort){
					applyMenuAwareOrder(query, root, cb, normalizedSortBy, direction);
				}else if(useRarityAwareSort){
					applyRarityAwareOrder(query, root, cb, direction);
				}
			}

			return cb.and(predicates.toArray(new Predicate[0]));
		};

		Page<GameItem> result = gameItemRepository.findAll(specification, queryPageable);
		List<GameItem> pageItems = result.getContent();
		List<Long> pageItemIds = pageItems.stream()
			.map(GameItem::getItemId)
			.toList();

		Map<Long, List<GameItemSummaryDto.BarterSourceInfo>> barterSourcesByItemId = pageItemIds.isEmpty()
			? Map.of()
			: lifeBarterRepository.findSummaryRowsByItemIdIn(pageItemIds)
				.stream()
				.collect(Collectors.groupingBy(
					LifeBarterRepository.BarterSummaryRow::getItemId,
					Collectors.mapping(
						row -> new GameItemSummaryDto.BarterSourceInfo(
							row.getRegionName(),
							row.getNpcName(),
							row.getExchangeItemName(),
							row.getExchangeCost()
						),
						Collectors.toList()
					)
				));

		Map<Long, Integer> craftRecipeCountByItemId = pageItemIds.isEmpty()
			? Map.of()
			: lifeCraftRepository.findRecipeCountsByItemIdIn(pageItemIds)
				.stream()
				.collect(Collectors.toMap(
					LifeCraftRepository.CraftRecipeCountRow::getItemId,
					row -> row.getRecipeCount() == null ? 0 : row.getRecipeCount().intValue(),
					(left, right) -> left,
					LinkedHashMap::new
				));

		List<GameItemSummaryDto> summaryItems = pageItems.stream().map(item -> {
			GameItemSummaryDto dto = GameItemSummaryDto.fromEntity(item);
			List<GameItemSummaryDto.BarterSourceInfo> barterSources = barterSourcesByItemId.getOrDefault(item.getItemId(), List.of());
			dto.setHasBarterSource(!barterSources.isEmpty());
			if(!barterSources.isEmpty()){
				dto.setBarterSources(barterSources);
			}

			int craftRecipeCount = craftRecipeCountByItemId.getOrDefault(item.getItemId(), 0);
			dto.setHasCraftSource(craftRecipeCount > 0);
			dto.setCraftRecipeCount(craftRecipeCount);

			return dto;
		}).toList();

		Page<GameItemSummaryDto> summaryPage = new PageImpl<>(summaryItems, responsePageable, result.getTotalElements());
		
		log.info("GameItems summary query done - total: {}, current page size: {}",
			summaryPage.getTotalElements(), summaryPage.getNumberOfElements());

		return summaryPage;
	}

	/**
	 * Returns distinct filter options and category tree for item search UI.
	 *
	 * @return item filter options
	 */
	public GameItemFilterOptionsDto getGameItemFilterOptions(){
		GameItemFilterOptionsDto dto = new GameItemFilterOptionsDto();
		dto.setItemMainMenus(sortMainMenus(new ArrayList<>(gameItemRepository.findDistinctItemMainMenus())));
		dto.setItemSubMenus(sortItemSubMenus(new ArrayList<>(gameItemRepository.findDistinctItemSubMenus())));
		dto.setItemTypes(sortItemTypesForCategory(null, null, new ArrayList<>(gameItemRepository.findDistinctItemTypes())));
		dto.setItemRarities(sortItemRarities(new ArrayList<>(gameItemRepository.findDistinctItemRarities())));
		dto.setItemCategoryTree(buildItemCategoryTree());
		return dto;
	}

	/**
	 * Builds a nested category tree (main menu > sub menu > item type).
	 *
	 * @return category tree list
	 */
	private List<GameItemFilterOptionsDto.ItemMainMenuOptionDto> buildItemCategoryTree(){
		Map<String, Map<String, LinkedHashSet<String>>> tree = new LinkedHashMap<>();

		for(Object[] row : gameItemRepository.findDistinctItemCategoryTriples()){
			String mainMenu = row.length > 0 && row[0] instanceof String ? ((String) row[0]).trim() : "";
			String subMenu = row.length > 1 && row[1] instanceof String ? ((String) row[1]).trim() : "";
			String itemType = row.length > 2 && row[2] instanceof String ? ((String) row[2]).trim() : "";

			if(!StringUtils.hasText(mainMenu) || !StringUtils.hasText(subMenu)){
				continue;
			}

			Map<String, LinkedHashSet<String>> subMenus = tree.computeIfAbsent(mainMenu, ignored -> new LinkedHashMap<>());
			LinkedHashSet<String> itemTypes = subMenus.computeIfAbsent(subMenu, ignored -> new LinkedHashSet<>());
			if(StringUtils.hasText(itemType)){
				itemTypes.add(itemType);
			}
		}

		List<GameItemFilterOptionsDto.ItemMainMenuOptionDto> result = new ArrayList<>();
		for(String mainMenu : sortMainMenus(new ArrayList<>(tree.keySet()))){
			Map<String, LinkedHashSet<String>> subMenuMap = tree.get(mainMenu);
			List<GameItemFilterOptionsDto.ItemSubMenuOptionDto> subMenuOptions = new ArrayList<>();
			for(String subMenu : sortSubMenusForMainMenu(mainMenu, new ArrayList<>(subMenuMap.keySet()))){
				LinkedHashSet<String> itemTypes = subMenuMap.getOrDefault(subMenu, new LinkedHashSet<>());
				subMenuOptions.add(new GameItemFilterOptionsDto.ItemSubMenuOptionDto(
					subMenu,
					sortItemTypesForCategory(mainMenu, subMenu, new ArrayList<>(itemTypes))
				));
			}

			result.add(new GameItemFilterOptionsDto.ItemMainMenuOptionDto(
				mainMenu,
				subMenuOptions
			));
		}

		return result;
	}

	/**
	 * Field MOUNT_PET_MAIN_MENU.
	 */
	private static final String MOUNT_PET_MAIN_MENU = "탈것/펫";
	/**
	 * Field PET_MOUNT_MAIN_MENU.
	 */
	private static final String PET_MOUNT_MAIN_MENU = "펫/탈것";
	/**
	 * Field COMPANION_PET_SUB_MENU.
	 */
	private static final String COMPANION_PET_SUB_MENU = "동행 펫";

	/**
	 * Field EQUIPMENT_MAIN_MENU.
	 */
	private static final String EQUIPMENT_MAIN_MENU = "장비";
	/**
	 * Field WEAPON_SUB_MENU.
	 */
	private static final String WEAPON_SUB_MENU = "무기";
	/**
	 * Field WEAPON_RUNE_SUB_MENU.
	 */
	private static final String WEAPON_RUNE_SUB_MENU = "무기 룬";

	private static final List<String> WEAPON_ITEM_TYPE_PREFIX_ORDER = List.of(
		"전사",
		"대검전사",
		"검술사",
		"궁수",
		"석궁사수",
		"장궁병",
		"마법사",
		"화염술사",
		"빙결술사",
		"전격술사",
		"힐러",
		"사제",
		"수도사",
		"암흑술사",
		"음유시인",
		"악사",
		"댄서",
		"도적",
		"격투가",
		"듀얼블레이드"
	);

	private static final List<ItemTypePrefixOrderRule> ITEM_TYPE_PREFIX_ORDER_RULES = List.of(
		new ItemTypePrefixOrderRule(EQUIPMENT_MAIN_MENU, WEAPON_SUB_MENU, WEAPON_ITEM_TYPE_PREFIX_ORDER),
		new ItemTypePrefixOrderRule(EQUIPMENT_MAIN_MENU, WEAPON_RUNE_SUB_MENU, WEAPON_ITEM_TYPE_PREFIX_ORDER)
	);

	private record ItemTypePrefixOrderRule(String itemMainMenu, String itemSubMenu, List<String> prefixOrder){}

	private static final List<List<String>> ITEM_RARITY_ORDER_ASC_ALIASES = List.of(
		List.of("일반", "노말", "normal", "common"),
		List.of("고급"),
		List.of("레어", "희귀", "rare"),
		List.of("엘리트", "영웅", "elite"),
		List.of("에픽", "epic"),
		List.of("유니크", "unique"),
		List.of("신화", "mythic"),
		List.of("전설", "legendary")
	);

	private static final List<List<String>> ITEM_RARITY_FILTER_ALIAS_GROUPS = List.of(
		List.of("일반", "노말", "고급", "normal", "common"),
		List.of("레어", "희귀", "rare"),
		List.of("엘리트", "영웅", "elite"),
		List.of("전설", "legendary"),
		List.of("신화", "mythic"),
		List.of("유니크", "unique"),
		List.of("에픽", "epic")
	);

	private static final List<String> ITEM_MAIN_MENU_ORDER = List.of(
		"장비",
		"도구",
		"아이템",
		"패션",
		MOUNT_PET_MAIN_MENU
	);

	private static final Map<String, List<String>> ITEM_SUB_MENU_ORDER_BY_MAIN_MENU = Map.of(
		"장비", List.of(
			"룬",
			"무기 룬",
			"방어구 룬",
			"엠블럼 룬",
			"장신구 룬",
			"무기",
			"방어구",
			"모자",
			"상의",
			"하의",
			"장갑",
			"신발",
			"장신구",
			"보석",
			"엠블럼",
			"아티팩트"
		),
		"도구", List.of("생활도구", "가방", "악기", "악보", "놀이", "데코", "기타"),
		"아이템", List.of("소모품", "음식", "펫슬롯", "재료", "재화", "퀘스트"),
		"패션", List.of("의상", "장식", "패션 무기", "염색"),
		MOUNT_PET_MAIN_MENU, List.of(COMPANION_PET_SUB_MENU, "탈것", "탈것 장비")
	);

	private static final Map<String, List<String>> ITEM_RARITY_EXPANSION_BY_ALIAS = buildItemRarityExpansionByAlias();
	private static final Map<String, Integer> ITEM_MAIN_MENU_RANK = buildItemMainMenuRank();
	private static final Map<String, Integer> ITEM_SUB_MENU_GLOBAL_RANK = buildItemSubMenuGlobalRank();
	private static final Map<String, Integer> ITEM_RARITY_RANK = buildItemRarityRank();

	/**
	 * Builds alias expansion lookup for rarity filter groups.
	 *
	 * @return rarity alias expansion map
	 */
	private static Map<String, List<String>> buildItemRarityExpansionByAlias(){
		Map<String, List<String>> expansions = new LinkedHashMap<>();
		for(List<String> aliases : ITEM_RARITY_FILTER_ALIAS_GROUPS){
			List<String> immutableAliases = List.copyOf(aliases);
			for(String alias : aliases){
				expansions.put(alias.toLowerCase(), immutableAliases);
			}
		}
		return Map.copyOf(expansions);
	}

	/**
	 * Builds main-menu ranking map for deterministic ordering.
	 *
	 * @return main-menu rank map
	 */
	private static Map<String, Integer> buildItemMainMenuRank(){
		Map<String, Integer> ranks = new LinkedHashMap<>();
		for(int index = 0 ; index < ITEM_MAIN_MENU_ORDER.size() ; index++){
			String menu = ITEM_MAIN_MENU_ORDER.get(index);
			ranks.put(menu, index);
			if(MOUNT_PET_MAIN_MENU.equals(menu)){
				ranks.put(PET_MOUNT_MAIN_MENU, index);
			}
		}
		return Map.copyOf(ranks);
	}

	/**
	 * Builds global sub-menu rank map.
	 *
	 * @return sub-menu rank map
	 */
	private static Map<String, Integer> buildItemSubMenuGlobalRank(){
		Map<String, Integer> ranks = new LinkedHashMap<>();
		int rank = 0;
		for(String mainMenu : ITEM_MAIN_MENU_ORDER){
			for(String subMenu : ITEM_SUB_MENU_ORDER_BY_MAIN_MENU.getOrDefault(mainMenu, List.of())){
				if(!ranks.containsKey(subMenu)){
					ranks.put(subMenu, rank++);
				}
			}
		}
		return Map.copyOf(ranks);
	}

	/**
	 * Builds rarity rank map from alias groups.
	 *
	 * @return rarity rank map
	 */
	private static Map<String, Integer> buildItemRarityRank(){
		Map<String, Integer> ranks = new LinkedHashMap<>();
		for(int rank = 0 ; rank < ITEM_RARITY_ORDER_ASC_ALIASES.size() ; rank++){
			for(String alias : ITEM_RARITY_ORDER_ASC_ALIASES.get(rank)){
				ranks.put(alias.toLowerCase(), rank);
			}
		}
		return Map.copyOf(ranks);
	}

	/**
	 * Sorts main menus using configured rank order.
	 *
	 * @param itemMainMenus main menus
	 * @return sorted main menus
	 */
	private List<String> sortMainMenus(List<String> itemMainMenus){
		itemMainMenus.sort(this::compareMainMenus);
		return itemMainMenus;
	}

	/**
	 * Sorts sub menus by global rank.
	 *
	 * @param itemSubMenus sub menus
	 * @return sorted sub menus
	 */
	private List<String> sortItemSubMenus(List<String> itemSubMenus){
		itemSubMenus.sort(this::compareSubMenusGlobally);
		return itemSubMenus;
	}

	/**
	 * Sorts sub menus for one main menu category.
	 *
	 * @param mainMenu main menu
	 * @param itemSubMenus sub menus
	 * @return sorted sub menus
	 */
	private List<String> sortSubMenusForMainMenu(String mainMenu, List<String> itemSubMenus){
		itemSubMenus.sort((left, right) -> compareSubMenusForMainMenu(mainMenu, left, right));
		return itemSubMenus;
	}

	/**
	 * Sorts rarity labels by configured rank.
	 *
	 * @param itemRarities rarity list
	 * @return sorted rarities
	 */
	private List<String> sortItemRarities(List<String> itemRarities){
		itemRarities.sort(this::compareRarities);
		return itemRarities;
	}

	/**
	 * Compares main-menu strings by rank and text.
	 *
	 * @param left left value
	 * @param right right value
	 * @return compare result
	 */
	private int compareMainMenus(String left, String right){
		int leftRank = getMainMenuRank(left);
		int rightRank = getMainMenuRank(right);
		if(leftRank != rightRank){
			return Integer.compare(leftRank, rightRank);
		}
		return compareNullableText(left, right);
	}

	/**
	 * Compares sub-menu strings by global rank and text.
	 *
	 * @param left left value
	 * @param right right value
	 * @return compare result
	 */
	private int compareSubMenusGlobally(String left, String right){
		int leftRank = getSubMenuGlobalRank(left);
		int rightRank = getSubMenuGlobalRank(right);
		if(leftRank != rightRank){
			return Integer.compare(leftRank, rightRank);
		}
		return compareNullableText(left, right);
	}

	/**
	 * Compares sub-menu strings under one main menu.
	 *
	 * @param mainMenu main menu
	 * @param left left value
	 * @param right right value
	 * @return compare result
	 */
	private int compareSubMenusForMainMenu(String mainMenu, String left, String right){
		int leftRank = getSubMenuRank(mainMenu, left);
		int rightRank = getSubMenuRank(mainMenu, right);
		if(leftRank != rightRank){
			return Integer.compare(leftRank, rightRank);
		}
		return compareNullableText(left, right);
	}

	/**
	 * Compares rarity labels by rank and text.
	 *
	 * @param left left value
	 * @param right right value
	 * @return compare result
	 */
	private int compareRarities(String left, String right){
		int leftRank = getRarityRank(left);
		int rightRank = getRarityRank(right);
		if(leftRank != rightRank){
			return Integer.compare(leftRank, rightRank);
		}
		return compareNullableText(left, right);
	}

	/**
	 * Returns rank for main menu.
	 *
	 * @param mainMenu main menu
	 * @return rank value
	 */
	private int getMainMenuRank(String mainMenu){
		if(!StringUtils.hasText(mainMenu)){
			return Integer.MAX_VALUE;
		}
		return ITEM_MAIN_MENU_RANK.getOrDefault(normalizeMainMenu(mainMenu), Integer.MAX_VALUE - 1);
	}

	/**
	 * Returns global rank for sub menu.
	 *
	 * @param subMenu sub menu
	 * @return rank value
	 */
	private int getSubMenuGlobalRank(String subMenu){
		if(!StringUtils.hasText(subMenu)){
			return Integer.MAX_VALUE;
		}
		return ITEM_SUB_MENU_GLOBAL_RANK.getOrDefault(subMenu.trim(), Integer.MAX_VALUE - 1);
	}

	/**
	 * Returns rank for sub menu in one main-menu context.
	 *
	 * @param mainMenu main menu
	 * @param subMenu sub menu
	 * @return rank value
	 */
	private int getSubMenuRank(String mainMenu, String subMenu){
		if(!StringUtils.hasText(subMenu)){
			return Integer.MAX_VALUE;
		}
		if(!StringUtils.hasText(mainMenu)){
			return getSubMenuGlobalRank(subMenu);
		}

		List<String> orderedSubMenus = ITEM_SUB_MENU_ORDER_BY_MAIN_MENU.getOrDefault(normalizeMainMenu(mainMenu), List.of());
		int orderedIndex = orderedSubMenus.indexOf(subMenu.trim());
		if(orderedIndex >= 0){
			return orderedIndex;
		}
		return Integer.MAX_VALUE - 1;
	}

	/**
	 * Returns rank for rarity text.
	 *
	 * @param rarity rarity label
	 * @return rank value
	 */
	private int getRarityRank(String rarity){
		if(!StringUtils.hasText(rarity)){
			return Integer.MAX_VALUE;
		}
		return ITEM_RARITY_RANK.getOrDefault(rarity.trim().toLowerCase(), Integer.MAX_VALUE - 1);
	}

	/**
	 * Normalizes main-menu alias values.
	 *
	 * @param mainMenu raw main-menu value
	 * @return normalized value
	 */
	private String normalizeMainMenu(String mainMenu){
		if(!StringUtils.hasText(mainMenu)){
			return "";
		}
		String trimmed = mainMenu.trim();
		return PET_MOUNT_MAIN_MENU.equals(trimmed) ? MOUNT_PET_MAIN_MENU : trimmed;
	}

	/**
	 * Compares nullable text values after normalization.
	 *
	 * @param left left text
	 * @param right right text
	 * @return compare result
	 */
	private int compareNullableText(String left, String right){
		return Comparator.nullsLast(String::compareTo).compare(normalizeComparableText(left), normalizeComparableText(right));
	}

	/**
	 * Normalizes text for comparison.
	 *
	 * @param value raw text
	 * @return normalized text or null
	 */
	private String normalizeComparableText(String value){
		return StringUtils.hasText(value) ? value.trim() : null;
	}

	/**
	 * Builds a simple Spring sort.
	 *
	 * @param sortBy sort field
	 * @param direction sort direction
	 * @return sort object
	 */
	private Sort buildSimpleSort(String sortBy, Sort.Direction direction){
		return Sort.by(direction, sortBy);
	}

	/**
	 * Returns whether sort key requires custom menu-aware ordering.
	 *
	 * @param sortBy sort field
	 * @return true when custom menu-aware sort is required
	 */
	private boolean isMenuAwareSort(String sortBy){
		return "itemMainMenu".equals(sortBy) || "itemSubMenu".equals(sortBy) || "itemType".equals(sortBy);
	}

	/**
	 * Returns whether sort key requires custom rarity ordering.
	 *
	 * @param sortBy sort field
	 * @return true when rarity-aware sort is required
	 */
	private boolean isRarityAwareSort(String sortBy){
		return "itemRarity".equals(sortBy);
	}

	/**
	 * Returns whether criteria query is a count query.
	 *
	 * @param query criteria query
	 * @return true when count query
	 */
	private boolean isCountQuery(CriteriaQuery<?> query){
		Class<?> resultType = query.getResultType();
		return resultType == Long.class || resultType == long.class;
	}

	/**
	 * Applies custom ordering for menu-aware sort fields.
	 *
	 * @param query criteria query
	 * @param root query root
	 * @param cb criteria builder
	 * @param sortBy requested sort field
	 * @param direction sort direction
	 */
	private void applyMenuAwareOrder(CriteriaQuery<?> query, Root<GameItem> root, CriteriaBuilder cb, String sortBy, Sort.Direction direction){
		List<Order> orders = new ArrayList<>();
		orders.add(toOrder(cb, buildItemMainMenuOrderExpression(root, cb), direction));
		orders.add(toOrder(cb, root.get("itemMainMenu"), direction));
		orders.add(toOrder(cb, buildItemSubMenuOrderExpression(root, cb), direction));
		orders.add(toOrder(cb, root.get("itemSubMenu"), direction));

		Sort.Direction itemTypeTieBreakerDirection = "itemType".equals(sortBy) ? direction : Sort.Direction.ASC;
		orders.add(toOrder(cb, buildConditionalItemTypeOrderExpression(root, cb), itemTypeTieBreakerDirection));
		orders.add(toOrder(cb, root.get("itemType"), itemTypeTieBreakerDirection));

		orders.add(cb.asc(root.get("itemName")));
		orders.add(cb.asc(root.get("itemId")));
		query.orderBy(orders);
	}

	/**
	 * Applies custom ordering for rarity sort.
	 *
	 * @param query criteria query
	 * @param root query root
	 * @param cb criteria builder
	 * @param direction sort direction
	 */
	private void applyRarityAwareOrder(CriteriaQuery<?> query, Root<GameItem> root, CriteriaBuilder cb, Sort.Direction direction){
		List<Order> orders = new ArrayList<>();
		orders.add(toOrder(cb, buildItemRarityOrderExpression(root, cb, direction), direction));
		orders.add(toOrder(cb, root.get("itemRarity"), direction));
		orders.add(cb.asc(buildItemMainMenuOrderExpression(root, cb)));
		orders.add(cb.asc(root.get("itemMainMenu")));
		orders.add(cb.asc(buildItemSubMenuOrderExpression(root, cb)));
		orders.add(cb.asc(root.get("itemSubMenu")));
		orders.add(cb.asc(buildConditionalItemTypeOrderExpression(root, cb)));
		orders.add(cb.asc(root.get("itemType")));
		orders.add(cb.asc(root.get("itemName")));
		orders.add(cb.asc(root.get("itemId")));
		query.orderBy(orders);
	}

	/**
	 * Builds rarity order CASE expression.
	 *
	 * @param root query root
	 * @param cb criteria builder
	 * @param direction sort direction
	 * @return rarity rank expression
	 */
	private Expression<Integer> buildItemRarityOrderExpression(Root<GameItem> root, CriteriaBuilder cb, Sort.Direction direction){
		Expression<String> itemRarity = cb.lower(root.get("itemRarity"));
		CriteriaBuilder.Case<Integer> caseExpression = cb.selectCase();

		for(int rank = 0; rank < ITEM_RARITY_ORDER_ASC_ALIASES.size(); rank++){
			caseExpression = caseExpression.when(itemRarity.in(ITEM_RARITY_ORDER_ASC_ALIASES.get(rank)), rank);
		}

		int unknownRank = direction == Sort.Direction.DESC ? -1 : 9999;
		return caseExpression.otherwise(unknownRank);
	}

	/**
	 * Converts direction and expression to Criteria order.
	 *
	 * @param cb criteria builder
	 * @param expression target expression
	 * @param direction sort direction
	 * @return criteria order
	 */
	private Order toOrder(CriteriaBuilder cb, Expression<?> expression, Sort.Direction direction){
		return direction == Sort.Direction.DESC ? cb.desc(expression) : cb.asc(expression);
	}

	/**
	 * Builds main-menu order CASE expression.
	 *
	 * @param root query root
	 * @param cb criteria builder
	 * @return main-menu rank expression
	 */
	private Expression<Integer> buildItemMainMenuOrderExpression(Root<GameItem> root, CriteriaBuilder cb){
		Expression<String> itemMainMenu = root.get("itemMainMenu");
		CriteriaBuilder.Case<Integer> caseExpression = cb.selectCase();

		for(int index = 0; index < ITEM_MAIN_MENU_ORDER.size(); index++){
			String mainMenu = ITEM_MAIN_MENU_ORDER.get(index);
			if(isMountPetMainMenu(mainMenu)){
				caseExpression = caseExpression.when(
					cb.or(
						cb.equal(itemMainMenu, MOUNT_PET_MAIN_MENU),
						cb.equal(itemMainMenu, PET_MOUNT_MAIN_MENU)
					),
					index
				);
			}else{
				caseExpression = caseExpression.when(cb.equal(itemMainMenu, mainMenu), index);
			}
		}

		return caseExpression.otherwise(999);
	}

	/**
	 * Builds sub-menu order CASE expression.
	 *
	 * @param root query root
	 * @param cb criteria builder
	 * @return sub-menu rank expression
	 */
	private Expression<Integer> buildItemSubMenuOrderExpression(Root<GameItem> root, CriteriaBuilder cb){
		Expression<String> itemMainMenu = root.get("itemMainMenu");
		Expression<String> itemSubMenu = root.get("itemSubMenu");
		CriteriaBuilder.Case<Integer> caseExpression = cb.selectCase();

		for(int mainIndex = 0; mainIndex < ITEM_MAIN_MENU_ORDER.size(); mainIndex++){
			String mainMenu = ITEM_MAIN_MENU_ORDER.get(mainIndex);
			List<String> subMenus = ITEM_SUB_MENU_ORDER_BY_MAIN_MENU.getOrDefault(mainMenu, List.of());
			for(int subIndex = 0; subIndex < subMenus.size(); subIndex++){
				String subMenu = subMenus.get(subIndex);
				int rank = (mainIndex * 100) + subIndex;
				caseExpression = caseExpression.when(
					cb.and(
						buildMainMenuMatchPredicate(itemMainMenu, cb, mainMenu),
						cb.equal(itemSubMenu, subMenu)
					),
					rank
				);
			}
		}

		return caseExpression.otherwise(9999);
	}

	/**
	 * Builds predicate to match one main-menu value including alias.
	 *
	 * @param itemMainMenu main-menu expression
	 * @param cb criteria builder
	 * @param mainMenu target main-menu
	 * @return predicate
	 */
	private Predicate buildMainMenuMatchPredicate(Expression<String> itemMainMenu, CriteriaBuilder cb, String mainMenu){
		if(isMountPetMainMenu(mainMenu)){
			return cb.or(
				cb.equal(itemMainMenu, MOUNT_PET_MAIN_MENU),
				cb.equal(itemMainMenu, PET_MOUNT_MAIN_MENU)
			);
		}
		return cb.equal(itemMainMenu, mainMenu);
	}

	/**
	 * Returns whether menu is mount/pet menu alias.
	 *
	 * @param mainMenu main-menu value
	 * @return true when mount/pet menu
	 */
	private boolean isMountPetMainMenu(String mainMenu){
		return MOUNT_PET_MAIN_MENU.equals(normalizeMainMenu(mainMenu));
	}

	/**
	 * Builds conditional item-type prefix rank expression.
	 *
	 * @param root query root
	 * @param cb criteria builder
	 * @return item-type rank expression
	 */
	private Expression<Integer> buildConditionalItemTypeOrderExpression(Root<GameItem> root, CriteriaBuilder cb){
		Expression<String> itemMainMenu = root.get("itemMainMenu");
		Expression<String> itemSubMenu = root.get("itemSubMenu");
		Expression<String> itemType = root.get("itemType");
		CriteriaBuilder.Case<Integer> caseExpression = cb.selectCase();

		for(int ruleIndex = 0; ruleIndex < ITEM_TYPE_PREFIX_ORDER_RULES.size(); ruleIndex++){
			ItemTypePrefixOrderRule rule = ITEM_TYPE_PREFIX_ORDER_RULES.get(ruleIndex);
			for(int prefixIndex = 0; prefixIndex < rule.prefixOrder().size(); prefixIndex++){
				String prefix = rule.prefixOrder().get(prefixIndex);
				int rank = (ruleIndex * 1000) + prefixIndex;
				caseExpression = caseExpression.when(
					cb.and(
						cb.equal(itemMainMenu, rule.itemMainMenu()),
						cb.equal(itemSubMenu, rule.itemSubMenu()),
						buildItemTypePrefixMatchPredicate(itemType, cb, prefix)
					),
					rank
				);
			}
		}

		return caseExpression.otherwise(9999);
	}

	/**
	 * Builds predicate for item type prefix matching.
	 *
	 * @param itemType item-type expression
	 * @param cb criteria builder
	 * @param prefix prefix text
	 * @return predicate
	 */
	private Predicate buildItemTypePrefixMatchPredicate(Expression<String> itemType, CriteriaBuilder cb, String prefix){
		return cb.or(
			cb.equal(itemType, prefix),
			cb.like(itemType, prefix + "%")
		);
	}

	/**
	 * Sorts item types by category-specific prefix rules.
	 *
	 * @param mainMenu main menu
	 * @param subMenu sub menu
	 * @param itemTypes item type list
	 * @return sorted item types
	 */
	private List<String> sortItemTypesForCategory(String mainMenu, String subMenu, List<String> itemTypes){
		itemTypes.sort((left, right) -> compareItemTypesForCategory(mainMenu, subMenu, left, right));
		return itemTypes;
	}

	/**
	 * Compares item types using conditional prefix rank.
	 *
	 * @param mainMenu main menu
	 * @param subMenu sub menu
	 * @param left left type
	 * @param right right type
	 * @return compare result
	 */
	private int compareItemTypesForCategory(String mainMenu, String subMenu, String left, String right){
		int leftRank = getConditionalItemTypePrefixRank(mainMenu, subMenu, left);
		int rightRank = getConditionalItemTypePrefixRank(mainMenu, subMenu, right);
		if(leftRank != rightRank){
			return Integer.compare(leftRank, rightRank);
		}
		return Comparator.nullsLast(String::compareTo).compare(left, right);
	}

	/**
	 * Returns prefix rank for item type in category.
	 *
	 * @param mainMenu main menu
	 * @param subMenu sub menu
	 * @param itemType item type
	 * @return rank value
	 */
	private int getConditionalItemTypePrefixRank(String mainMenu, String subMenu, String itemType){
		if(!StringUtils.hasText(itemType)){
			return Integer.MAX_VALUE;
		}

		ItemTypePrefixOrderRule rule = findItemTypePrefixOrderRule(mainMenu, subMenu);
		if(rule == null){
			return Integer.MAX_VALUE - 1;
		}

		String normalized = itemType.trim();
		for(int index = 0; index < rule.prefixOrder().size(); index++){
			if(matchesItemTypePrefix(normalized, rule.prefixOrder().get(index))){
				return index;
			}
		}

		return Integer.MAX_VALUE - 1;
	}

	/**
	 * Resolves prefix-order rule for one category.
	 *
	 * @param mainMenu main menu
	 * @param subMenu sub menu
	 * @return matching rule or null
	 */
	private ItemTypePrefixOrderRule findItemTypePrefixOrderRule(String mainMenu, String subMenu){
		if(!StringUtils.hasText(mainMenu) || !StringUtils.hasText(subMenu)){
			return null;
		}

		String normalizedMainMenu = mainMenu.trim();
		String normalizedSubMenu = subMenu.trim();
		for(ItemTypePrefixOrderRule rule : ITEM_TYPE_PREFIX_ORDER_RULES){
			if(rule.itemMainMenu().equals(normalizedMainMenu) && rule.itemSubMenu().equals(normalizedSubMenu)){
				return rule;
			}
		}

		return null;
	}

	/**
	 * Returns whether item type equals or starts with target prefix.
	 *
	 * @param itemType item type text
	 * @param prefix prefix text
	 * @return true when matched
	 */
	private boolean matchesItemTypePrefix(String itemType, String prefix){
		return itemType.equals(prefix) || itemType.startsWith(prefix);
	}

	/**
	 * Expands selected rarity aliases to full matching groups.
	 *
	 * @param rarities selected rarity filters
	 * @return expanded rarity filter list
	 */
	private List<String> expandRarityFilters(List<String> rarities){
		if(rarities == null || rarities.isEmpty()){
			return List.of();
		}

		Set<String> expanded = new LinkedHashSet<>();
		for(String rarity : rarities){
			if(!StringUtils.hasText(rarity)){
				continue;
			}

			String normalized = rarity.trim().toLowerCase();
			List<String> aliases = ITEM_RARITY_EXPANSION_BY_ALIAS.get(normalized);
			if(aliases != null){
				expanded.addAll(aliases);
				continue;
			}

			expanded.add(rarity.trim());
		}

		return expanded.stream().toList();
	}
}
