import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import {
	BarterFilterRegionOption,
	CraftFilterTypeOption,
	GameItem,
	GameItemFilterMainMenuOption,
	GameItemSummary,
	LifeBarter,
	LifeCraft,
	ListSearchParams
} from "@/types";
import GameItemService from "@/services/game-item-service";
import ItemDetailModal from "@/components/game/item-detail-modal";
import {fromItemSlug, getItemRarityInfo, toItemDetailPath} from "@/utils";
import {useSeo} from "@/hooks/use-seo";
import {
	DEFAULT_ITEM_MAIN_MENU,
	DEFAULT_ITEM_RARITY_OPTIONS,
	DEFAULT_ITEM_SUB_MENU,
	EQUIPMENT_MAIN_MENU,
	EQUIPMENT_SUB_MENU_ORDER,
	GameItemsControls,
	GameItemsResults,
	GameItemsTabs,
	ITEM_MAIN_MENU_ORDER_INDEX,
	ITEM_SUB_MENU_ORDER_INDEX_BY_MAIN_MENU,
	ITEM_TAB_PATHS,
	MAX_SEARCH_SUGGESTIONS,
	normalizeMainMenuForOrder,
	resolveTabFromPath,
	sortByPreferredOrder,
	sortRarityLabelsForFilter
} from "@/features/game-items";
import type {SearchSuggestion, SortOption, TabType} from "@/features/game-items";
import ItemDetailPage from "./item-detail";
import styles from "./game-items.module.scss";

type GameItemsRouteState = {
	openAsModal?:boolean;
	modalRuntimeId?:string;
};

/**
 * Constant MODAL_ROUTE_RUNTIME_ID.
 */
const MODAL_ROUTE_RUNTIME_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const GameItemsPage:React.FC = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const {itemName : paramItemName} = useParams<{itemName:string}>();
	const decodedItemName = paramItemName ? fromItemSlug(paramItemName) : null;
	const routeState = location.state as GameItemsRouteState | null;
	const isDetailRoute = Boolean(decodedItemName);
	const isModalDetailRoute = isDetailRoute
		&& routeState?.openAsModal === true
		&& routeState?.modalRuntimeId === MODAL_ROUTE_RUNTIME_ID;
	const isStandaloneDetailPage = isDetailRoute && !isModalDetailRoute;

	const [selectedItem, setSelectedItem] = useState<GameItem | GameItemSummary | null>(null);
	const [activeTab, setActiveTab] = useState<TabType>(() => resolveTabFromPath(location.pathname));

	const seoTitle = decodedItemName
		? decodedItemName
		: activeTab === "barter"
			? "물물교환 데이터"
			: activeTab === "craft"
				? "제작 데이터"
				: "아이템 데이터";
	const seoDescription = decodedItemName
		? `${decodedItemName} 아이템 상세 정보 페이지입니다.`
		: activeTab === "barter"
			? "물물교환 교환 정보와 재료를 확인할 수 있습니다."
			: activeTab === "craft"
				? "제작 레시피와 재료 정보를 확인할 수 있습니다."
				: "아이템 스펙, 획득처 분류 정보를 확인할 수 있습니다.";
	const seoCanonicalPath = decodedItemName
		? toItemDetailPath(decodedItemName)
		: ITEM_TAB_PATHS[activeTab];

	useSeo({
		title : seoTitle,
		description : seoDescription,
		canonicalPath : seoCanonicalPath
	});

	const [items, setItems] = useState<GameItemSummary[]>([]);
	const [barters, setBarters] = useState<LifeBarter[]>([]);
	const [crafts, setCrafts] = useState<LifeCraft[]>([]);

	const [loading, setLoading] = useState(false);
	const [hasMoreData, setHasMoreData] = useState(true);
	const [, setCurrentPage] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const [keyword, setKeyword] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [sortBy, setSortBy] = useState<string>("itemRarity");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const [manualSearchTick, setManualSearchTick] = useState(0);
	const [itemCategoryTree, setItemCategoryTree] = useState<GameItemFilterMainMenuOption[]>([]);
	const [itemTypeOptions, setItemTypeOptions] = useState<string[]>([]);
	const [selectedItemMainMenu, setSelectedItemMainMenu] = useState(DEFAULT_ITEM_MAIN_MENU);
	const [selectedItemSubMenu, setSelectedItemSubMenu] = useState(DEFAULT_ITEM_SUB_MENU);
	const [selectedItemType, setSelectedItemType] = useState("");
	const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
	const [availableRarities, setAvailableRarities] = useState<string[]>(DEFAULT_ITEM_RARITY_OPTIONS);
	const [barterRegionOptions, setBarterRegionOptions] = useState<BarterFilterRegionOption[]>([]);
	const [selectedBarterRegionId, setSelectedBarterRegionId] = useState("");
	const [selectedBarterNpcId, setSelectedBarterNpcId] = useState("");
	const [craftTypeOptions, setCraftTypeOptions] = useState<CraftFilterTypeOption[]>([]);
	const [selectedCraftType, setSelectedCraftType] = useState("");
	const [selectedCraftName, setSelectedCraftName] = useState("");
	const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
	const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
	const [searchSuggestionsLoading, setSearchSuggestionsLoading] = useState(false);
	const inFlightRef = useRef(false);
	const currentPageRef = useRef(0);
	const hasMoreDataRef = useRef(true);
	const searchBoxRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if(isModalDetailRoute && decodedItemName){
			setSelectedItem((prev) => {
				if(prev?.itemName === decodedItemName){
					return prev;
				}
				return {itemName : decodedItemName} as GameItemSummary;
			});
			return;
		}
		setSelectedItem(null);
	}, [decodedItemName, isModalDetailRoute]);

	useEffect(() => {
		if(isStandaloneDetailPage){
			return;
		}

		const trimmedKeyword = searchInput.trim();
		if(!trimmedKeyword){
			setSearchSuggestions([]);
			setSearchSuggestionsLoading(false);
			return;
		}

		let active = true;
		const timer = window.setTimeout(async() => {
			setSearchSuggestionsLoading(true);
			try{
				if(activeTab === "items"){
					const response = await GameItemService.getGameItems({
						page : 0,
						size : MAX_SEARCH_SUGGESTIONS,
						sortBy : "itemName",
						sortDir : "asc",
						keyword : trimmedKeyword,
						itemMainMenu : selectedItemMainMenu || undefined,
						itemSubMenu : selectedItemSubMenu || undefined,
						itemType : selectedItemType || undefined,
						itemRarity : selectedRarities.length > 0 ? selectedRarities : undefined
					});
					if(active){
						setSearchSuggestions(response.content.map((item) => ({
							key : `item-${item.itemId}`,
							keyword : item.itemName,
							title : item.itemName,
							subtitle : [item.itemType, item.itemRarity].filter(Boolean).join(" / "),
							meta : [item.itemMainMenu, item.itemSubMenu].filter(Boolean).join(" > ")
						})));
					}
				}else if(activeTab === "barter"){
					const response = await GameItemService.getBarters({
						page : 0,
						size : MAX_SEARCH_SUGGESTIONS,
						sortBy : "regionId",
						sortDir : "asc",
						keyword : trimmedKeyword,
						regionId : selectedBarterRegionId ? Number(selectedBarterRegionId) : undefined,
						npcId : selectedBarterNpcId ? Number(selectedBarterNpcId) : undefined
					});

					const deduped = new Map<string, SearchSuggestion>();
					for(const barter of response.content){
						/**
						 * Utility function obtainedName.
						 */
						const obtainedName = (barter.gameItem?.itemName || "").trim();
						/**
						 * Utility function exchangeName.
						 */
						const exchangeName = (barter.exchangeItem?.itemName || "").trim();
						/**
						 * Utility function npcName.
						 */
						const npcName = (barter.gameNpc?.npcName || "").trim();
						/**
						 * Utility function regionName.
						 */
						const regionName = (barter.gameRegion?.regionName || "").trim();
						const keywordCandidate = obtainedName || exchangeName;
						if(!keywordCandidate){
							continue;
						}
						const dedupeKey = `${obtainedName}|${exchangeName}|${npcName}`;
						if(deduped.has(dedupeKey)){
							continue;
						}
						deduped.set(dedupeKey, {
							key : `barter-${barter.barterId}-${barter.itemId}-${barter.exchangeId}`,
							keyword : keywordCandidate,
							title : `${obtainedName || "-"} ↔ ${exchangeName || "-"}`,
							subtitle : `${regionName || "-"} / ${npcName || "-"}`,
							meta : `교환 ${barter.exchangeCost ?? 0}개, 최대 ${barter.barterQty ?? 0}회`
						});
					}
					if(active){
						setSearchSuggestions(Array.from(deduped.values()).slice(0, MAX_SEARCH_SUGGESTIONS));
					}
				}else{
					const response = await GameItemService.getCrafts({
						page : 0,
						size : MAX_SEARCH_SUGGESTIONS,
						sortBy : "craftType",
						sortDir : "asc",
						keyword : trimmedKeyword,
						craftType : selectedCraftType || undefined,
						craftName : selectedCraftName || undefined
					});

					const deduped = new Map<string, SearchSuggestion>();
					for(const craft of response.content){
						/**
						 * Utility function productName.
						 */
						const productName = (craft.itemName || craft.gameItem?.itemName || "").trim();
						/**
						 * Utility function ingredientName.
						 */
						const ingredientName = (craft.ingredientName || craft.ingredientItem?.itemName || "").trim();
						if(!productName){
							continue;
						}
						const dedupeKey = `${productName}|${craft.craftType}|${craft.craftName}`;
						if(deduped.has(dedupeKey)){
							continue;
						}
						deduped.set(dedupeKey, {
							key : `craft-${craft.craftId}-${craft.craftSubId}-${craft.itemId}`,
							keyword : productName,
							title : productName,
							subtitle : `${craft.craftType || "-"} > ${craft.craftName || "-"}`,
							meta : `재료 ${ingredientName || "-"} x${craft.craftIngredientCost ?? 0}`
						});
					}
					if(active){
						setSearchSuggestions(Array.from(deduped.values()).slice(0, MAX_SEARCH_SUGGESTIONS));
					}
				}
			}catch(error){
				console.error("추천 검색 데이터 로드 실패:", error);
				if(active){
					setSearchSuggestions([]);
				}
			}finally{
				if(active){
					setSearchSuggestionsLoading(false);
				}
			}
		}, 250);

		return () => {
			active = false;
			window.clearTimeout(timer);
		};
	}, [
		activeTab,
		searchInput,
		selectedItemMainMenu,
		selectedItemSubMenu,
		selectedItemType,
		selectedRarities,
		selectedBarterRegionId,
		selectedBarterNpcId,
		selectedCraftType,
		selectedCraftName,
		isStandaloneDetailPage
	]);

	useEffect(() => {
		/**
		 * Utility function handlePointerDown.
		 */
		const handlePointerDown = (event:PointerEvent) => {
			const target = event.target as Node | null;
			if(!target){
				return;
			}
			if(searchBoxRef.current?.contains(target)){
				return;
			}
			setShowSearchSuggestions(false);
		};

		document.addEventListener("pointerdown", handlePointerDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
		};
	}, []);

	useEffect(() => {
		if(isStandaloneDetailPage){
			return;
		}
		if(activeTab !== "items"){
			return;
		}

		/**
		 * Utility function async.
		 */
		const fetchFilterOptions = async() => {
			try{
				const response = await GameItemService.getGameItemFilterOptions();
				setItemCategoryTree(response.itemCategoryTree || []);
				setItemTypeOptions(response.itemTypes || []);
				const normalizedRarities = Array.from(new Set((response.itemRarities || []).map((rarity) => getItemRarityInfo(rarity).label)));
				const extraRarities = normalizedRarities.filter((rarity) => !DEFAULT_ITEM_RARITY_OPTIONS.includes(rarity));
				setAvailableRarities(sortRarityLabelsForFilter([...DEFAULT_ITEM_RARITY_OPTIONS, ...extraRarities]));
			}catch(error){
				console.error("아이템 필터 옵션 로드 실패:", error);
			}
		};

		fetchFilterOptions();
	}, [activeTab, isStandaloneDetailPage]);

	useEffect(() => {
		if(isStandaloneDetailPage){
			return;
		}
		if(activeTab !== "barter" || barterRegionOptions.length > 0){
			return;
		}

		/**
		 * Utility function async.
		 */
		const fetchBarterFilterOptions = async() => {
			try{
				const response = await GameItemService.getBarterFilterOptions();
				setBarterRegionOptions(response.regions || []);
			}catch(error){
				console.error("물물교환 필터 옵션 로드 실패:", error);
			}
		};

		fetchBarterFilterOptions();
	}, [activeTab, barterRegionOptions.length, isStandaloneDetailPage]);

	useEffect(() => {
		if(isStandaloneDetailPage){
			return;
		}
		if(activeTab !== "craft" || craftTypeOptions.length > 0){
			return;
		}

		/**
		 * Utility function async.
		 */
		const fetchCraftFilterOptions = async() => {
			try{
				const response = await GameItemService.getCraftFilterOptions();
				setCraftTypeOptions(response.craftTypes || []);
			}catch(error){
				console.error("제작 필터 옵션 로드 실패:", error);
			}
		};

		fetchCraftFilterOptions();
	}, [activeTab, craftTypeOptions.length, isStandaloneDetailPage]);

	const getSortOptions = useCallback(():SortOption[] => {
		switch(activeTab){
			case "items":
				return [
					{value : "itemMainMenu-asc", label : "상위 메뉴 이름차순"},
					{value : "itemMainMenu-desc", label : "상위 메뉴 역순"},
					{value : "itemSubMenu-asc", label : "하위 메뉴 이름차순"},
					{value : "itemSubMenu-desc", label : "하위 메뉴 역순"},
					{value : "itemType-asc", label : "유형 이름차순"},
					{value : "itemType-desc", label : "유형 역순"},
					{value : "itemName-asc", label : "이름 이름차순"},
					{value : "itemName-desc", label : "이름 역순"},
					{value : "itemRarity-asc", label : "등급 이름차순"},
					{value : "itemRarity-desc", label : "등급 역순"}
				];
			case "barter":
				return [
					{value : "regionId-asc", label : "지역 이름차순"},
					{value : "regionId-desc", label : "지역 역순"},
					{value : "npcId-asc", label : "NPC 이름차순"},
					{value : "npcId-desc", label : "NPC 역순"}
				];
			case "craft":
				return [
					{value : "craftType-asc", label : "가공/제작 이름차순"},
					{value : "craftType-desc", label : "가공/제작 역순"},
					{value : "craftName-asc", label : "세부분류 이름차순"},
					{value : "craftName-desc", label : "세부분류 역순"}
				];
		}
	}, [activeTab]);

	/**
	 * Utility function getDefaultSort.
	 */
	const getDefaultSort = (tab:TabType) => {
		switch(tab){
			case "items":
				return {sortBy : "itemRarity", sortDir : "desc" as const};
			case "barter":
				return {sortBy : "regionId", sortDir : "asc" as const};
			case "craft":
				return {sortBy : "craftType", sortDir : "asc" as const};
		}
	};

	const loadData = useCallback(async(reset = false) => {
		if(isStandaloneDetailPage){
			return;
		}
		if(inFlightRef.current || (!hasMoreDataRef.current && !reset)){
			return;
		}

		inFlightRef.current = true;
		setLoading(true);

		try{
			const params:ListSearchParams & {
				itemMainMenu?:string;
				itemSubMenu?:string;
				itemType?:string;
				itemRarity?:string[];
				regionId?:number;
				npcId?:number;
				craftType?:string;
				craftName?:string;
			} = {
				page : reset ? 0 : currentPageRef.current,
				size : 10,
				sortBy,
				sortDir,
				keyword : keyword || undefined
			};

			if(activeTab === "items"){
				params.itemMainMenu = selectedItemMainMenu || undefined;
				params.itemSubMenu = selectedItemSubMenu || undefined;
				params.itemType = selectedItemType || undefined;
				params.itemRarity = selectedRarities.length > 0 ? selectedRarities : undefined;
			}else if(activeTab === "barter"){
				params.regionId = selectedBarterRegionId ? Number(selectedBarterRegionId) : undefined;
				params.npcId = selectedBarterNpcId ? Number(selectedBarterNpcId) : undefined;
			}else if(activeTab === "craft"){
				params.craftType = selectedCraftType || undefined;
				params.craftName = selectedCraftName || undefined;
			}

			if(activeTab === "items"){
				const response = await GameItemService.getGameItems(params);
				if(reset){
					setItems(response.content);
					currentPageRef.current = 1;
					setCurrentPage(1);
				}else{
					setItems((prev) => {
						const merged = new Map<number, GameItemSummary>();
						prev.forEach((item) => merged.set(item.itemId, item));
						response.content.forEach((item) => merged.set(item.itemId, item));
						return Array.from(merged.values());
					});
					currentPageRef.current = currentPageRef.current + 1;
					setCurrentPage((prev) => prev + 1);
				}
				setTotalElements(response.totalElements);
				const nextHasMore = !response.last;
				hasMoreDataRef.current = nextHasMore;
				setHasMoreData(nextHasMore);
			}else if(activeTab === "barter"){
				const response = await GameItemService.getBarters(params);
				if(reset){
					setBarters(response.content);
					currentPageRef.current = 1;
					setCurrentPage(1);
				}else{
					setBarters((prev) => {
						const merged = new Map<string, LifeBarter>();
						prev.forEach((barter) => merged.set(`${barter.barterId}-${barter.itemId}-${barter.exchangeId}`, barter));
						response.content.forEach((barter) => merged.set(`${barter.barterId}-${barter.itemId}-${barter.exchangeId}`, barter));
						return Array.from(merged.values());
					});
					currentPageRef.current = currentPageRef.current + 1;
					setCurrentPage((prev) => prev + 1);
				}
				setTotalElements(response.totalElements);
				const nextHasMore = !response.last;
				hasMoreDataRef.current = nextHasMore;
				setHasMoreData(nextHasMore);
			}else{
				const response = await GameItemService.getCrafts(params);
				if(reset){
					setCrafts(response.content);
					currentPageRef.current = 1;
					setCurrentPage(1);
				}else{
					setCrafts((prev) => {
						const merged = new Map<string, LifeCraft>();
						prev.forEach((craft) => merged.set(`${craft.craftId}-${craft.craftSubId}-${craft.craftIngredientId}`, craft));
						response.content.forEach((craft) => merged.set(`${craft.craftId}-${craft.craftSubId}-${craft.craftIngredientId}`, craft));
						return Array.from(merged.values());
					});
					currentPageRef.current = currentPageRef.current + 1;
					setCurrentPage((prev) => prev + 1);
				}
				setTotalElements(response.totalElements);
				const nextHasMore = !response.last;
				hasMoreDataRef.current = nextHasMore;
				setHasMoreData(nextHasMore);
			}
		}catch(error){
			console.error("데이터 로드 실패:", error);
		}finally{
			inFlightRef.current = false;
			setLoading(false);
		}
	}, [
		activeTab,
		keyword,
		selectedItemMainMenu,
		selectedItemSubMenu,
		selectedItemType,
		selectedRarities,
		selectedBarterRegionId,
		selectedBarterNpcId,
		selectedCraftType,
		selectedCraftName,
		isStandaloneDetailPage,
		sortBy,
		sortDir
	]);

	const resetPagingState = useCallback(() => {
		currentPageRef.current = 0;
		hasMoreDataRef.current = true;
		setCurrentPage(0);
		setHasMoreData(true);
		setItems([]);
		setBarters([]);
		setCrafts([]);
	}, []);

	const applyTabState = useCallback((tab:TabType) => {
		setActiveTab(tab);
		const defaultSort = getDefaultSort(tab);
		setSortBy(defaultSort.sortBy);
		setSortDir(defaultSort.sortDir);
		setSearchInput("");
		setKeyword("");
		setSelectedItemMainMenu(tab === "items" ? DEFAULT_ITEM_MAIN_MENU : "");
		setSelectedItemSubMenu(tab === "items" ? DEFAULT_ITEM_SUB_MENU : "");
		setSelectedItemType("");
		setSelectedRarities([]);
		setSelectedBarterRegionId("");
		setSelectedBarterNpcId("");
		setSelectedCraftType("");
		setSelectedCraftName("");
		setShowSearchSuggestions(false);
		setSearchSuggestions([]);
		setSearchSuggestionsLoading(false);
		resetPagingState();
	}, [resetPagingState]);

	useEffect(() => {
		if(isDetailRoute){
			return;
		}

		const tabFromPath = resolveTabFromPath(location.pathname);
		if(tabFromPath === activeTab){
			return;
		}

		applyTabState(tabFromPath);
	}, [activeTab, applyTabState, isDetailRoute, location.pathname]);

	/**
	 * Utility function handleTabChange.
	 */
	const handleTabChange = (tab:TabType) => {
		const targetPath = ITEM_TAB_PATHS[tab];
		if(location.pathname !== targetPath){
			navigate(targetPath);
		}
		if(tab !== activeTab){
			applyTabState(tab);
		}
	};

	/**
	 * Utility function handleSearch.
	 */
	const handleSearch = () => {
		setKeyword(searchInput.trim());
		setShowSearchSuggestions(false);
		resetPagingState();
		setManualSearchTick((prev) => prev + 1);
	};

	/**
	 * Utility function handleReset.
	 */
	const handleReset = () => {
		setSearchInput("");
		setKeyword("");
		setSelectedItemMainMenu(activeTab === "items" ? DEFAULT_ITEM_MAIN_MENU : "");
		setSelectedItemSubMenu(activeTab === "items" ? DEFAULT_ITEM_SUB_MENU : "");
		setSelectedItemType("");
		setSelectedRarities([]);
		setSelectedBarterRegionId("");
		setSelectedBarterNpcId("");
		setSelectedCraftType("");
		setSelectedCraftName("");
		setShowSearchSuggestions(false);
		setSearchSuggestions([]);
		setSearchSuggestionsLoading(false);
		resetPagingState();
		setManualSearchTick((prev) => prev + 1);
	};

	/**
	 * Utility function applySearchSuggestion.
	 */
	const applySearchSuggestion = (nextKeyword:string) => {
		const trimmed = nextKeyword.trim();
		if(!trimmed){
			return;
		}
		setSearchInput(trimmed);
		setKeyword(trimmed);
		setShowSearchSuggestions(false);
		resetPagingState();
		setManualSearchTick((prev) => prev + 1);
	};

	/**
	 * Utility function handleSortChange.
	 */
	const handleSortChange = (newSortBy:string, newSortDir:"asc" | "desc") => {
		setSortBy(newSortBy);
		setSortDir(newSortDir);
		resetPagingState();
	};

	/**
	 * Utility function handleToggleRarity.
	 */
	const handleToggleRarity = (rarity:string) => {
		setSelectedRarities((prev) => {
			if(prev.includes(rarity)){
				return prev.filter((value) => value !== rarity);
			}
			return [...prev, rarity];
		});
	};

	const handleScroll = useCallback(() => {
		if(
			window.innerHeight + document.documentElement.scrollTop >=
			document.documentElement.offsetHeight - 900
		){
			loadData();
		}
	}, [loadData]);

	/**
	 * Utility function handleKeyPress.
	 */
	const handleKeyPress = (event:React.KeyboardEvent<HTMLInputElement>) => {
		if(event.key === "Enter"){
			handleSearch();
		}
	};

	useEffect(() => {
		if(isStandaloneDetailPage){
			return;
		}
		loadData(true);
	}, [
		activeTab,
		keyword,
		sortBy,
		sortDir,
		selectedItemMainMenu,
		selectedItemSubMenu,
		selectedItemType,
		selectedRarities,
		selectedBarterRegionId,
		selectedBarterNpcId,
		selectedCraftType,
		selectedCraftName,
		manualSearchTick,
		isStandaloneDetailPage,
		loadData
	]);

	useEffect(() => {
		if(isStandaloneDetailPage){
			return;
		}
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [handleScroll, isStandaloneDetailPage]);

	const currentDataLength = useMemo(() => {
		switch(activeTab){
			case "items":
				return items.length;
			case "barter":
				return barters.length;
			case "craft":
				return crafts.length;
		}
	}, [activeTab, barters.length, crafts.length, items.length]);

	const tabTitle = useMemo(() => {
		switch(activeTab){
			case "items":
				return "아이템";
			case "barter":
				return "물물교환";
			case "craft":
				return "제작";
		}
	}, [activeTab]);

	const availableItemMainMenus = useMemo(
		() => Array.from(
			new Set(
				itemCategoryTree
					.map((category) => category.itemMainMenu)
					.filter((value):value is string => Boolean(value))
			)
		).sort((a, b) => sortByPreferredOrder(normalizeMainMenuForOrder(a), normalizeMainMenuForOrder(b), ITEM_MAIN_MENU_ORDER_INDEX)),
		[itemCategoryTree]
	);

	const selectedMainMenuCategory = useMemo(
		() => itemCategoryTree.find((category) => category.itemMainMenu === selectedItemMainMenu) || null,
		[itemCategoryTree, selectedItemMainMenu]
	);

	const availableItemSubMenus = useMemo(
		() => {
			const subMenus = selectedMainMenuCategory?.subMenus || [];
			const normalizedMainMenu = normalizeMainMenuForOrder(selectedItemMainMenu);
			const orderIndexMap = normalizedMainMenu ? ITEM_SUB_MENU_ORDER_INDEX_BY_MAIN_MENU[normalizedMainMenu] : undefined;
			return [...subMenus].sort((a, b) => sortByPreferredOrder(a.itemSubMenu, b.itemSubMenu, orderIndexMap));
		},
		[selectedItemMainMenu, selectedMainMenuCategory]
	);

	useEffect(() => {
		if(activeTab !== "items" || selectedItemMainMenu !== EQUIPMENT_MAIN_MENU){
			return;
		}

		if(availableItemSubMenus.length === 0){
			return;
		}

		// Keep "전체" selected for sub menu when user intentionally leaves it empty.
		if(!selectedItemSubMenu){
			return;
		}

		if(availableItemSubMenus.some((subMenu) => subMenu.itemSubMenu === selectedItemSubMenu)){
			return;
		}

		const fallbackSubMenu = EQUIPMENT_SUB_MENU_ORDER.find((subMenu) =>
			availableItemSubMenus.some((option) => option.itemSubMenu === subMenu)
		) ?? availableItemSubMenus[0]?.itemSubMenu;
		if(!fallbackSubMenu){
			return;
		}

		setSelectedItemSubMenu(fallbackSubMenu);
		setSelectedItemType("");
	}, [activeTab, availableItemSubMenus, selectedItemMainMenu, selectedItemSubMenu]);

	const selectedSubMenuCategory = useMemo(
		() => availableItemSubMenus.find((subMenu) => subMenu.itemSubMenu === selectedItemSubMenu) || null,
		[availableItemSubMenus, selectedItemSubMenu]
	);

	const availableItemTypes = useMemo(() => {
		if(selectedSubMenuCategory){
			return selectedSubMenuCategory.itemTypes || [];
		}

		if(itemCategoryTree.length > 0){
			return [];
		}

		return itemTypeOptions;
	}, [itemCategoryTree.length, itemTypeOptions, selectedSubMenuCategory]);

	const useHierarchicalItemFilters = itemCategoryTree.length > 0;
	const isItemSubMenuDisabled = !useHierarchicalItemFilters || !selectedItemMainMenu;
	const isItemTypeDisabled = useHierarchicalItemFilters && !selectedItemSubMenu;

	const availableBarterNpcs = useMemo(() => {
		if(!selectedBarterRegionId){
			return [];
		}

		const region = barterRegionOptions.find((option) => String(option.regionId) === selectedBarterRegionId);
		return region?.npcs || [];
	}, [barterRegionOptions, selectedBarterRegionId]);

	const availableCraftNames = useMemo(() => {
		if(!selectedCraftType){
			return [];
		}

		const selectedType = craftTypeOptions.find((option) => option.craftType === selectedCraftType);
		return selectedType?.craftNames || [];
	}, [craftTypeOptions, selectedCraftType]);

	if(isStandaloneDetailPage){
		return <ItemDetailPage/>;
	}

	return (
		<div className={styles.gameItemsPage}>
			<div className={styles.container}>
				<h1 className="page-heading">{"게임 데이터"}</h1>

				<GameItemsTabs activeTab={activeTab} onTabChange={handleTabChange}/>

				<GameItemsControls
					activeTab={activeTab}
					loading={loading}
					tabTitle={tabTitle}
					searchInput={searchInput}
					showSearchSuggestions={showSearchSuggestions}
					searchSuggestions={searchSuggestions}
					searchSuggestionsLoading={searchSuggestionsLoading}
					onSearchInputChange={(value) => {
						setSearchInput(value);
						setShowSearchSuggestions(Boolean(value.trim()));
					}}
					onSearchInputFocus={() => {
						if(searchInput.trim()){
							setShowSearchSuggestions(true);
						}
					}}
					onSearchInputKeyPress={handleKeyPress}
					onApplySearchSuggestion={applySearchSuggestion}
					onSearch={handleSearch}
					onReset={handleReset}
					searchBoxRef={searchBoxRef}
					sortBy={sortBy}
					sortDir={sortDir}
					sortOptions={getSortOptions()}
					onSortChange={handleSortChange}
					useHierarchicalItemFilters={useHierarchicalItemFilters}
					availableItemMainMenus={availableItemMainMenus}
					selectedItemMainMenu={selectedItemMainMenu}
					onItemMainMenuChange={(value) => {
						setSelectedItemMainMenu(value);
						setSelectedItemSubMenu("");
						setSelectedItemType("");
						resetPagingState();
					}}
					availableItemSubMenus={availableItemSubMenus}
					selectedItemSubMenu={selectedItemSubMenu}
					onItemSubMenuChange={(value) => {
						setSelectedItemSubMenu(value);
						setSelectedItemType("");
						resetPagingState();
					}}
					availableItemTypes={availableItemTypes}
					selectedItemType={selectedItemType}
					onItemTypeChange={(value) => {
						setSelectedItemType(value);
						resetPagingState();
					}}
					isItemSubMenuDisabled={isItemSubMenuDisabled}
					isItemTypeDisabled={isItemTypeDisabled}
					availableRarities={availableRarities}
					selectedRarities={selectedRarities}
					onToggleRarity={(rarity) => {
						handleToggleRarity(rarity);
						resetPagingState();
					}}
					barterRegionOptions={barterRegionOptions}
					selectedBarterRegionId={selectedBarterRegionId}
					onBarterRegionChange={(value) => {
						setSelectedBarterRegionId(value);
						setSelectedBarterNpcId("");
						resetPagingState();
					}}
					availableBarterNpcs={availableBarterNpcs}
					selectedBarterNpcId={selectedBarterNpcId}
					onBarterNpcChange={(value) => {
						setSelectedBarterNpcId(value);
						resetPagingState();
					}}
					craftTypeOptions={craftTypeOptions}
					selectedCraftType={selectedCraftType}
					onCraftTypeChange={(value) => {
						setSelectedCraftType(value);
						setSelectedCraftName("");
						resetPagingState();
					}}
					availableCraftNames={availableCraftNames}
					selectedCraftName={selectedCraftName}
					onCraftNameChange={(value) => {
						setSelectedCraftName(value);
						resetPagingState();
					}}
				/>

				<GameItemsResults
					activeTab={activeTab}
					keyword={keyword}
					totalElements={totalElements}
					currentDataLength={currentDataLength}
					tabTitle={tabTitle}
					items={items}
					barters={barters}
					crafts={crafts}
					onItemClick={(clickedItem) => {
						setSelectedItem(clickedItem);
						navigate(toItemDetailPath(clickedItem.itemName), {
							state : {openAsModal : true, modalRuntimeId : MODAL_ROUTE_RUNTIME_ID} satisfies GameItemsRouteState
						});
					}}
					onBarterClick={(clickedBarter) => {
						if(clickedBarter.gameItem){
							setSelectedItem(clickedBarter.gameItem);
							navigate(toItemDetailPath(clickedBarter.gameItem.itemName), {
								state : {openAsModal : true, modalRuntimeId : MODAL_ROUTE_RUNTIME_ID} satisfies GameItemsRouteState
							});
						}
					}}
					onCraftClick={(clickedCraft) => {
						const targetName = clickedCraft.itemName || clickedCraft.gameItem?.itemName;
						if(targetName){
							if(clickedCraft.gameItem){
								setSelectedItem(clickedCraft.gameItem);
							}
							navigate(toItemDetailPath(targetName), {
								state : {openAsModal : true, modalRuntimeId : MODAL_ROUTE_RUNTIME_ID} satisfies GameItemsRouteState
							});
						}
					}}
					loading={loading}
					hasMoreData={hasMoreData}
				/>

				{selectedItem && (
					<ItemDetailModal
						item={selectedItem}
						onClose={() => {
							setSelectedItem(null);
							navigate(-1);
						}}
					/>
				)}
			</div>
		</div>
	);
};

export default GameItemsPage;
