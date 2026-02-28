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
	private final GameItemRepository gameItemRepository;
	private final LifeBarterRepository lifeBarterRepository;
	private final LifeCraftRepository lifeCraftRepository;
	
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

		Page<GameItemSummaryDto> summaryPage = new PageImpl<>(summaryItems, responsePageable, result.getTotalElements());
		
		log.info("GameItems summary query done - total: {}, current page size: {}",
			summaryPage.getTotalElements(), summaryPage.getNumberOfElements());

		return summaryPage;
	}

	public GameItemFilterOptionsDto getGameItemFilterOptions(){
		GameItemFilterOptionsDto dto = new GameItemFilterOptionsDto();
		dto.setItemMainMenus(gameItemRepository.findDistinctItemMainMenus());
		dto.setItemSubMenus(gameItemRepository.findDistinctItemSubMenus());
		dto.setItemTypes(sortItemTypesForCategory(null, null, new ArrayList<>(gameItemRepository.findDistinctItemTypes())));
		dto.setItemRarities(gameItemRepository.findDistinctItemRarities());
		dto.setItemCategoryTree(buildItemCategoryTree());
		return dto;
	}

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
		for(Map.Entry<String, Map<String, LinkedHashSet<String>>> mainEntry : tree.entrySet()){
			List<GameItemFilterOptionsDto.ItemSubMenuOptionDto> subMenuOptions = new ArrayList<>();
			for(Map.Entry<String, LinkedHashSet<String>> subEntry : mainEntry.getValue().entrySet()){
				subMenuOptions.add(new GameItemFilterOptionsDto.ItemSubMenuOptionDto(
					subEntry.getKey(),
					sortItemTypesForCategory(mainEntry.getKey(), subEntry.getKey(), new ArrayList<>(subEntry.getValue()))
				));
			}

			result.add(new GameItemFilterOptionsDto.ItemMainMenuOptionDto(
				mainEntry.getKey(),
				subMenuOptions
			));
		}

		return result;
	}

	private static final String MOUNT_PET_MAIN_MENU = "\uD0C8\uAC83/\uD3AB";
	private static final String PET_MOUNT_MAIN_MENU = "\uD3AB/\uD0C8\uAC83";
	private static final String COMPANION_PET_SUB_MENU = "\uB3D9\uD589 \uD3AB";

	private static final String EQUIPMENT_MAIN_MENU = "\uC7A5\uBE44";
	private static final String WEAPON_SUB_MENU = "\uBB34\uAE30";
	private static final String WEAPON_RUNE_SUB_MENU = "\uBB34\uAE30 \uB8EC";

	private static final List<String> WEAPON_ITEM_TYPE_PREFIX_ORDER = List.of(
		"\uC804\uC0AC",
		"\uB300\uAC80\uC804\uC0AC",
		"\uAC80\uC220\uC0AC",
		"\uAD81\uC218",
		"\uC11D\uAD81\uC0AC\uC218",
		"\uC7A5\uAD81\uBCD1",
		"\uB9C8\uBC95\uC0AC",
		"\uD654\uC5FC\uC220\uC0AC",
		"\uBE59\uACB0\uC220\uC0AC",
		"\uC804\uACA9\uC220\uC0AC",
		"\uD790\uB7EC",
		"\uC0AC\uC81C",
		"\uC218\uB3C4\uC0AC",
		"\uC554\uD751\uC220\uC0AC",
		"\uC74C\uC720\uC2DC\uC778",
		"\uC545\uC0AC",
		"\uB304\uC11C",
		"\uB3C4\uC801",
		"\uACA9\uD22C\uAC00",
		"\uB4C0\uC5BC\uBE14\uB808\uC774\uB4DC"
	);

	private static final List<ItemTypePrefixOrderRule> ITEM_TYPE_PREFIX_ORDER_RULES = List.of(
		new ItemTypePrefixOrderRule(EQUIPMENT_MAIN_MENU, WEAPON_SUB_MENU, WEAPON_ITEM_TYPE_PREFIX_ORDER),
		new ItemTypePrefixOrderRule(EQUIPMENT_MAIN_MENU, WEAPON_RUNE_SUB_MENU, WEAPON_ITEM_TYPE_PREFIX_ORDER)
	);

	private record ItemTypePrefixOrderRule(String itemMainMenu, String itemSubMenu, List<String> prefixOrder){}

	private static final List<List<String>> ITEM_RARITY_ORDER_ASC_ALIASES = List.of(
		List.of("\uC77C\uBC18", "\uB178\uB9D0", "normal", "common"),
		List.of("\uACE0\uAE09"),
		List.of("\uB808\uC5B4", "\uD76C\uADC0", "rare"),
		List.of("\uC5D8\uB9AC\uD2B8", "\uC601\uC6C5", "elite"),
		List.of("\uC5D0\uD53D", "epic"),
		List.of("\uC720\uB2C8\uD06C", "unique"),
		List.of("\uC2E0\uD654", "mythic"),
		List.of("\uC804\uC124", "legendary")
	);

	private static final List<String> ITEM_MAIN_MENU_ORDER = List.of(
		"\uC7A5\uBE44",
		"\uB3C4\uAD6C",
		"\uC544\uC774\uD15C",
		"\uD328\uC158",
		MOUNT_PET_MAIN_MENU
	);

	private static final Map<String, List<String>> ITEM_SUB_MENU_ORDER_BY_MAIN_MENU = Map.of(
		"\uC7A5\uBE44", List.of(
			"\uB8EC",
			"\uBB34\uAE30 \uB8EC",
			"\uBC29\uC5B4\uAD6C \uB8EC",
			"\uC5E0\uBE14\uB7FC \uB8EC",
			"\uC7A5\uC2E0\uAD6C \uB8EC",
			"\uBB34\uAE30",
			"\uBC29\uC5B4\uAD6C",
			"\uBAA8\uC790",
			"\uC0C1\uC758",
			"\uD558\uC758",
			"\uC7A5\uAC11",
			"\uC2E0\uBC1C",
			"\uC7A5\uC2E0\uAD6C",
			"\uBCF4\uC11D",
			"\uC5E0\uBE14\uB7FC",
			"\uC544\uD2F0\uD329\uD2B8"
		),
		"\uB3C4\uAD6C", List.of("\uC0DD\uD65C\uB3C4\uAD6C", "\uAC00\uBC29", "\uC545\uAE30", "\uC545\uBCF4", "\uB180\uC774", "\uB370\uCF54", "\uAE30\uD0C0"),
		"\uC544\uC774\uD15C", List.of("\uC18C\uBAA8\uD488", "\uC74C\uC2DD", "\uD035\uC2AC\uB86F", "\uC7AC\uB8CC", "\uC7AC\uD654", "\uD018\uC2A4\uD2B8"),
		"\uD328\uC158", List.of("\uC758\uC0C1", "\uC7A5\uC2DD", "\uD328\uC158 \uBB34\uAE30", "\uC5FC\uC0C9"),
		MOUNT_PET_MAIN_MENU, List.of(COMPANION_PET_SUB_MENU, "\uD0C8\uAC83", "\uD0C8\uAC83 \uC7A5\uBE44")
	);

	private Sort buildSimpleSort(String sortBy, Sort.Direction direction){
		return Sort.by(direction, sortBy);
	}

	private boolean isMenuAwareSort(String sortBy){
		return "itemMainMenu".equals(sortBy) || "itemSubMenu".equals(sortBy) || "itemType".equals(sortBy);
	}

	private boolean isRarityAwareSort(String sortBy){
		return "itemRarity".equals(sortBy);
	}

	private boolean isCountQuery(CriteriaQuery<?> query){
		Class<?> resultType = query.getResultType();
		return resultType == Long.class || resultType == long.class;
	}

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

	private Expression<Integer> buildItemRarityOrderExpression(Root<GameItem> root, CriteriaBuilder cb, Sort.Direction direction){
		Expression<String> itemRarity = cb.lower(root.get("itemRarity"));
		CriteriaBuilder.Case<Integer> caseExpression = cb.selectCase();

		for(int rank = 0; rank < ITEM_RARITY_ORDER_ASC_ALIASES.size(); rank++){
			caseExpression = caseExpression.when(itemRarity.in(ITEM_RARITY_ORDER_ASC_ALIASES.get(rank)), rank);
		}

		int unknownRank = direction == Sort.Direction.DESC ? -1 : 9999;
		return caseExpression.otherwise(unknownRank);
	}

	private Order toOrder(CriteriaBuilder cb, Expression<?> expression, Sort.Direction direction){
		return direction == Sort.Direction.DESC ? cb.desc(expression) : cb.asc(expression);
	}

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

	private Predicate buildMainMenuMatchPredicate(Expression<String> itemMainMenu, CriteriaBuilder cb, String mainMenu){
		if(isMountPetMainMenu(mainMenu)){
			return cb.or(
				cb.equal(itemMainMenu, MOUNT_PET_MAIN_MENU),
				cb.equal(itemMainMenu, PET_MOUNT_MAIN_MENU)
			);
		}
		return cb.equal(itemMainMenu, mainMenu);
	}

	private boolean isMountPetMainMenu(String mainMenu){
		return MOUNT_PET_MAIN_MENU.equals(mainMenu) || PET_MOUNT_MAIN_MENU.equals(mainMenu);
	}

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

	private Predicate buildItemTypePrefixMatchPredicate(Expression<String> itemType, CriteriaBuilder cb, String prefix){
		return cb.or(
			cb.equal(itemType, prefix),
			cb.like(itemType, prefix + "%")
		);
	}

	private List<String> sortItemTypesForCategory(String mainMenu, String subMenu, List<String> itemTypes){
		itemTypes.sort((left, right) -> compareItemTypesForCategory(mainMenu, subMenu, left, right));
		return itemTypes;
	}

	private int compareItemTypesForCategory(String mainMenu, String subMenu, String left, String right){
		int leftRank = getConditionalItemTypePrefixRank(mainMenu, subMenu, left);
		int rightRank = getConditionalItemTypePrefixRank(mainMenu, subMenu, right);
		if(leftRank != rightRank){
			return Integer.compare(leftRank, rightRank);
		}
		return Comparator.nullsLast(String::compareTo).compare(left, right);
	}

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

	private boolean matchesItemTypePrefix(String itemType, String prefix){
		return itemType.equals(prefix) || itemType.startsWith(prefix);
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
