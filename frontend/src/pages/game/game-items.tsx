import React, {useState, useEffect, useCallback, useMemo, useRef} from "react";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import {
	BarterFilterRegionOption, CraftFilterTypeOption, GameItem, GameItemFilterMainMenuOption, GameItemSummary, LifeBarter, LifeCraft, ListSearchParams
} from "@/types";
import GameItemService from "@/services/game-item-service";
import GameItemCard from "@/components/game/game-item-card";
import BarterCard from "@/components/game/barter-card";
import CraftCard from "@/components/game/craft-card";
import ItemDetailModal from "@/components/game/item-detail-modal";
import {Search, RefreshCw, Package, ArrowLeftRight, Hammer} from "lucide-react";
import {fromItemSlug, getItemRarityInfo, toItemDetailPath} from "@/utils";
import {useSeo} from "@/hooks/use-seo";
import ItemDetailPage from "./item-detail";
import styles from "./game-items.module.scss";

type TabType = "items" | "barter" | "craft";
type GameItemsRouteState = {
	openAsModal?:boolean;
	modalRuntimeId?:string;
};

type SearchSuggestion = {
	key:string;
	keyword:string;
	title:string;
	subtitle?:string;
	meta?:string;
};

const MODAL_ROUTE_RUNTIME_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const MAX_SEARCH_SUGGESTIONS = 8;

const DEFAULT_ITEM_RARITY_OPTIONS = ["일반", "고급", "레어", "엘리트", "에픽", "유니크", "전설", "신화"];
const EQUIPMENT_MAIN_MENU = "장비";
const DEFAULT_ITEM_MAIN_MENU = "";
const DEFAULT_ITEM_SUB_MENU = "";
const EQUIPMENT_SUB_MENU_ORDER = [
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
] as const;

const ITEM_MAIN_MENU_ORDER = [EQUIPMENT_MAIN_MENU, "가구", "아이템", "포션", "의상/탈것"] as const;

const ITEM_SUB_MENU_ORDER_BY_MAIN_MENU:Record<string, string[]> = {
	[EQUIPMENT_MAIN_MENU] : [...EQUIPMENT_SUB_MENU_ORDER]
};

const createOrderIndexMap = (values:readonly string[]):Map<string, number> => new Map(values.map((value, index) => [value, index]));

const ITEM_MAIN_MENU_ORDER_INDEX = createOrderIndexMap(ITEM_MAIN_MENU_ORDER);
const ITEM_SUB_MENU_ORDER_INDEX_BY_MAIN_MENU:Record<string, Map<string, number>> = Object.fromEntries(
	Object.entries(ITEM_SUB_MENU_ORDER_BY_MAIN_MENU).map(([mainMenu, subMenus]) => [mainMenu, createOrderIndexMap(subMenus)])
);

const compareByPreferredOrder = (a:string, b:string, orderIndexMap?:Map<string, number>):number => {
	const fallbackIndex = Number.MAX_SAFE_INTEGER;
	const aOrder = orderIndexMap?.get(a) ?? fallbackIndex;
	const bOrder = orderIndexMap?.get(b) ?? fallbackIndex;

	if(aOrder !== bOrder){
		return aOrder - bOrder;
	}

	return a.localeCompare(b, "ko");
};

const ITEM_RARITY_FILTER_ORDER = ["일반", "고급", "레어", "엘리트", "에픽", "유니크", "전설", "신화"] as const;
const ITEM_RARITY_FILTER_ORDER_INDEX = createOrderIndexMap(ITEM_RARITY_FILTER_ORDER);

const sortRarityLabelsForFilter = (rarities:string[]):string[] => [...rarities].sort((a, b) => compareByPreferredOrder(a, b, ITEM_RARITY_FILTER_ORDER_INDEX));

const normalizeSortText = (value:string | null | undefined):string => (value ?? "").trim();

const normalizeMainMenuForOrder = (value:string | null | undefined):string => {
	const normalized = normalizeSortText(value);
	if(!normalized){
		return normalized;
	}

	const canonicalSlashMenu = ITEM_MAIN_MENU_ORDER.find((menu) => menu.includes("/"));
	if(!canonicalSlashMenu || normalized === canonicalSlashMenu){
		return normalized;
	}

	const toSignature = (menu:string):string => menu
		.split("/")
		.map((part) => part.trim())
		.filter(Boolean)
		.sort((a, b) => a.localeCompare(b, "ko"))
		.join("|");

	if(toSignature(normalized) === toSignature(canonicalSlashMenu)){
		return canonicalSlashMenu;
	}

	return normalized;
};

const ITEM_TAB_PATHS:Record<TabType, string> = {
	items : "/items",
	barter : "/barter",
	craft : "/craft"
};

const resolveTabFromPath = (pathname:string):TabType => {
	const normalizedPath = pathname.toLowerCase();
	if(
		normalizedPath.startsWith("/barter")
		|| normalizedPath.startsWith("/items/barter")
		|| normalizedPath.startsWith("/item/barter")
	){
		return "barter";
	}
	if(
		normalizedPath.startsWith("/craft")
		|| normalizedPath.startsWith("/items/craft")
		|| normalizedPath.startsWith("/item/craft")
	){
		return "craft";
	}
	return "items";
};

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
			? "물물교환 교환 정보와 재료를 검색할 수 있습니다."
			: activeTab === "craft"
				? "제작 레시피와 재료 정보를 검색할 수 있습니다."
				: "아이템 스펙, 획득처, 분류 정보를 검색할 수 있습니다.";
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
						const obtainedName = (barter.gameItem?.itemName || "").trim();
						const exchangeName = (barter.exchangeItem?.itemName || "").trim();
						const npcName = (barter.gameNpc?.npcName || "").trim();
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
							meta : `교환 ${barter.exchangeCost ?? 0}개 · 최대 ${barter.barterQty ?? 0}회`
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
						const productName = (craft.itemName || craft.gameItem?.itemName || "").trim();
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
	
	const getSortOptions = () => {
		switch(activeTab){
			case "items":
				return [
					{value : "itemMainMenu-asc", label : "상위 메뉴 오름차순"},
					{value : "itemMainMenu-desc", label : "상위 메뉴 내림차순"},
					{value : "itemSubMenu-asc", label : "하위 메뉴 오름차순"},
					{value : "itemSubMenu-desc", label : "하위 메뉴 내림차순"},
					{value : "itemType-asc", label : "유형 오름차순"},
					{value : "itemType-desc", label : "유형 내림차순"},
					{value : "itemName-asc", label : "이름 오름차순"},
					{value : "itemName-desc", label : "이름 내림차순"},
					{value : "itemRarity-asc", label : "등급 오름차순"},
					{value : "itemRarity-desc", label : "등급 내림차순"}
				];
			case "barter":
				return [
					{value : "regionId-asc", label : "지역 오름차순"},
					{value : "regionId-desc", label : "지역 내림차순"},
					{value : "npcId-asc", label : "NPC 오름차순"},
					{value : "npcId-desc", label : "NPC 내림차순"}
				];
			case "craft":
				return [
					{value : "craftType-asc", label : "가공/제작 오름차순"},
					{value : "craftType-desc", label : "가공/제작 내림차순"},
					{value : "craftName-asc", label : "소분류 오름차순"},
					{value : "craftName-desc", label : "소분류 내림차순"}
				];
		}
	};
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
	
	const resetPagingState = () => {
		currentPageRef.current = 0;
		hasMoreDataRef.current = true;
		setCurrentPage(0);
		setHasMoreData(true);
		setItems([]);
		setBarters([]);
		setCrafts([]);
	};


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
	}, []);

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
	
	const handleTabChange = (tab:TabType) => {
		const targetPath = ITEM_TAB_PATHS[tab];
		if(location.pathname !== targetPath){
			navigate(targetPath);
		}
		if(tab !== activeTab){
			applyTabState(tab);
		}
	};
	
	const handleSearch = () => {
		setKeyword(searchInput.trim());
		setShowSearchSuggestions(false);
		resetPagingState();
		setManualSearchTick((prev) => prev + 1);
	};
	
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
	
	const handleSortChange = (newSortBy:string, newSortDir:"asc" | "desc") => {
		setSortBy(newSortBy);
		setSortDir(newSortDir);
		resetPagingState();
	};
	
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
	
	const handleKeyPress = (e:React.KeyboardEvent) => {
		if(e.key === "Enter"){
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
		).sort((a, b) => compareByPreferredOrder(normalizeMainMenuForOrder(a), normalizeMainMenuForOrder(b), ITEM_MAIN_MENU_ORDER_INDEX)),
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
			return [...subMenus].sort((a, b) => compareByPreferredOrder(a.itemSubMenu, b.itemSubMenu, orderIndexMap));
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
				<div className="page-heading">
					<h1>{"게임 데이터"}</h1>
					<p className="page-heading-subtitle">{"아이템, 물물교환, 제작 정보를 탐색해보세요."}</p>
				</div>
				
				<div className={styles.tabContainer}>
					<button
						className={`${styles.tabButton} ${activeTab === "items" ? styles.active : ""}`}
						onClick={() => handleTabChange("items")}
					>
						<Package size={18}/>
						<span>{"아이템"}</span>
					</button>
					<button
						className={`${styles.tabButton} ${activeTab === "barter" ? styles.active : ""}`}
						onClick={() => handleTabChange("barter")}
					>
						<ArrowLeftRight size={18}/>
						<span>{"물물교환"}</span>
					</button>
					<button
						className={`${styles.tabButton} ${activeTab === "craft" ? styles.active : ""}`}
						onClick={() => handleTabChange("craft")}
					>
						<Hammer size={18}/>
						<span>{"제작"}</span>
					</button>
				</div>
				
				<div className={styles.controlsSection}>
					<div className={styles.controlsTopRow}>
						<div className={styles.searchContainer}>
							<div className={styles.searchBox} ref={searchBoxRef}>
								<Search size={20} className={styles.searchIcon}/>
								<input
									type="text"
									placeholder={`${tabTitle} 이름으로 검색...`}
									value={searchInput}
									onChange={(e) => {
										const value = e.target.value;
										setSearchInput(value);
										setShowSearchSuggestions(Boolean(value.trim()));
									}}
									onKeyPress={handleKeyPress}
									onFocus={() => {
										if(searchInput.trim()){
											setShowSearchSuggestions(true);
										}
									}}
									className={styles.searchInput}
								/>
								{showSearchSuggestions && searchInput.trim() && (
									<div className={styles.searchSuggestionDropdown}>
										{searchSuggestions.length > 0 ? (
											searchSuggestions.map((suggestion) => (
												<button
													key={suggestion.key}
													type="button"
													className={styles.searchSuggestionItem}
													onClick={() => applySearchSuggestion(suggestion.keyword)}
												>
													<span className={styles.searchSuggestionTitle}>{suggestion.title}</span>
													{suggestion.subtitle && <span className={styles.searchSuggestionSubtitle}>{suggestion.subtitle}</span>}
													{suggestion.meta && <span className={styles.searchSuggestionMeta}>{suggestion.meta}</span>}
												</button>
											))
										) : (
											<div className={styles.searchSuggestionEmpty}>
												{searchSuggestionsLoading ? "검색 중..." : "추천 검색 결과가 없습니다."}
											</div>
										)}
									</div>
								)}
							</div>
							<button onClick={handleSearch} className={styles.searchBtn} disabled={loading}>
								{loading ? <RefreshCw className={styles.spinning} size={16}/> : "검색"}
							</button>
							<button onClick={handleReset} className={styles.resetBtn} disabled={loading}>
								{"초기화"}
							</button>
						</div>
						
						<div className={styles.sortContainer}>
							<label>{"정렬"}</label>
							<select
								value={`${sortBy}-${sortDir}`}
								onChange={(e) => {
									const [newSortBy, newSortDir] = e.target.value.split("-");
									handleSortChange(newSortBy, newSortDir as "asc" | "desc");
								}}
								className={styles.sortSelect}
							>
								{getSortOptions().map((option) => (
									<option key={option.value} value={option.value}>{option.label}</option>
								))}
							</select>
						</div>
					</div>
					<div className={styles.filtersSection}>
						{activeTab === "items" && (
							<div className={`${styles.filterGrid} ${styles.itemFilterGrid}`}>
								<div className={styles.filterField}>
									<label htmlFor="item-main-menu-filter">{"상위 메뉴"}</label>
									<select
										id="item-main-menu-filter"
										value={selectedItemMainMenu}
										onChange={(e) => {
											setSelectedItemMainMenu(e.target.value);
											setSelectedItemSubMenu("");
											setSelectedItemType("");
											resetPagingState();
										}}
										className={styles.filterSelect}
										disabled={!useHierarchicalItemFilters}
									>
										<option value="">{"전체"}</option>
										{availableItemMainMenus.map((itemMainMenu) => (
											<option key={itemMainMenu} value={itemMainMenu}>{itemMainMenu}</option>
										))}
									</select>
								</div>
								
								<div className={styles.filterField}>
									<label htmlFor="item-sub-menu-filter">{"하위 메뉴"}</label>
									<select
										id="item-sub-menu-filter"
										value={selectedItemSubMenu}
										onChange={(e) => {
											setSelectedItemSubMenu(e.target.value);
											setSelectedItemType("");
											resetPagingState();
										}}
										className={styles.filterSelect}
										disabled={isItemSubMenuDisabled}
									>
										<option value="">{"전체"}</option>
										{availableItemSubMenus.map((subMenu) => (
											<option key={subMenu.itemSubMenu} value={subMenu.itemSubMenu}>{subMenu.itemSubMenu}</option>
										))}
									</select>
								</div>
								
								<div className={styles.filterField}>
									<label htmlFor="item-type-filter">{"유형"}</label>
									<select
										id="item-type-filter"
										value={selectedItemType}
										onChange={(e) => {
											setSelectedItemType(e.target.value);
											resetPagingState();
										}}
										className={styles.filterSelect}
										disabled={isItemTypeDisabled}
									>
										<option value="">{"전체"}</option>
										{availableItemTypes.map((itemType) => (
											<option key={itemType} value={itemType}>{itemType}</option>
										))}
									</select>
								</div>
								
								<div className={`${styles.filterField} ${styles.itemRarityFilter} ${styles.filterFieldFullWidth}`}>
									<span className={styles.rarityLabel}>{"아이템 등급"}</span>
									<div className={styles.rarityOptions}>
										{availableRarities.map((rarity) => {
											const rarityInfo = getItemRarityInfo(rarity);
											const checked = selectedRarities.includes(rarity);
											return (
												<label key={rarity}
													   className={`${styles.rarityOption} ${checked ? styles.selected : ""}`}>
													<input
														type="checkbox"
														checked={checked}
														onChange={() => {
															handleToggleRarity(rarity);
															resetPagingState();
														}}
													/>
													<span
														className={styles.rarityBadge}
														style={{
															color : rarityInfo.color,
															borderColor : rarityInfo.color,
															backgroundColor : rarityInfo.bg
														}}
													>
										{rarityInfo.label}
									</span>
												</label>
											);
										})}
									</div>
								</div>
							</div>
						)}
						
						{activeTab === "barter" && (
							<div className={styles.filterGrid}>
								<div className={styles.filterField}>
									<label htmlFor="barter-region-filter">{"지역 (대분류)"}</label>
									<select
										id="barter-region-filter"
										value={selectedBarterRegionId}
										onChange={(e) => {
											const nextRegionId = e.target.value;
											setSelectedBarterRegionId(nextRegionId);
											setSelectedBarterNpcId("");
											resetPagingState();
										}}
										className={styles.filterSelect}
									>
										<option value="">{"전체 지역"}</option>
										{barterRegionOptions.map((region) => (
											<option key={region.regionId}
													value={region.regionId}>{region.regionName}</option>
										))}
									</select>
								</div>
								
								<div className={styles.filterField}>
									<label htmlFor="barter-npc-filter">{"NPC (분류)"}</label>
									<select
										id="barter-npc-filter"
										value={selectedBarterNpcId}
										onChange={(e) => {
											setSelectedBarterNpcId(e.target.value);
											resetPagingState();
										}}
										className={styles.filterSelect}
										disabled={!selectedBarterRegionId}
									>
										<option value="">{"전체 NPC"}</option>
										{availableBarterNpcs.map((npc) => (
											<option key={npc.npcId} value={npc.npcId}>{npc.npcName}</option>
										))}
									</select>
								</div>
							</div>
						)}
						
						{activeTab === "craft" && (
							<div className={styles.filterGrid}>
								<div className={styles.filterField}>
									<label htmlFor="craft-type-filter">{"가공/제작 (대분류)"}</label>
									<select
										id="craft-type-filter"
										value={selectedCraftType}
										onChange={(e) => {
											const nextCraftType = e.target.value;
											setSelectedCraftType(nextCraftType);
											setSelectedCraftName("");
											resetPagingState();
										}}
										className={styles.filterSelect}
									>
										<option value="">{"전체"}</option>
										{craftTypeOptions.map((option) => (
											<option key={option.craftType}
													value={option.craftType}>{option.craftType}</option>
										))}
									</select>
								</div>
								
								<div className={styles.filterField}>
									<label htmlFor="craft-name-filter">{"세부분류"}</label>
									<select
										id="craft-name-filter"
										value={selectedCraftName}
										onChange={(e) => {
											setSelectedCraftName(e.target.value);
											resetPagingState();
										}}
										className={styles.filterSelect}
										disabled={!selectedCraftType}
									>
										<option value="">{"전체"}</option>
										{availableCraftNames.map((craftName) => (
											<option key={craftName} value={craftName}>{craftName}</option>
										))}
									</select>
								</div>
							</div>
						)}
					</div>
				</div>
				<div className={styles.resultsInfo}>
					{keyword ? (
						<p>
							{"검색 결과: 총 " + totalElements + "개 " + tabTitle + " 중 " + currentDataLength + "개 표시"}</p>
					) : (
						<p>{"총 " + totalElements + "개 " + tabTitle + " 중 " + currentDataLength + "개 표시"}</p>
					)}
				</div>
				
				<div className={styles.itemsGrid}>
					{activeTab === "items" && items.map((item) => (
						<GameItemCard
							key={item.itemId}
							item={item}
							onClick={(clickedItem) => {
								setSelectedItem(clickedItem);
								navigate(toItemDetailPath(clickedItem.itemName), {
									state : {openAsModal : true, modalRuntimeId : MODAL_ROUTE_RUNTIME_ID} satisfies GameItemsRouteState
								});
							}}
						/>
					))}
					{activeTab === "barter" && barters.map((barter) => (
						<BarterCard
							key={`${barter.barterId}-${barter.itemId}-${barter.exchangeId}`}
							barter={barter}
							onClick={(clickedBarter) => {
								if(clickedBarter.gameItem){
									setSelectedItem(clickedBarter.gameItem);
									navigate(toItemDetailPath(clickedBarter.gameItem.itemName), {
										state : {openAsModal : true, modalRuntimeId : MODAL_ROUTE_RUNTIME_ID} satisfies GameItemsRouteState
									});
								}
							}}
						/>
					))}
					{activeTab === "craft" && crafts.map((craft) => (
						<CraftCard
							key={`${craft.craftId}-${craft.craftSubId}-${craft.craftIngredientId}`}
							craft={craft}
							onClick={(clickedCraft) => {
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
						/>
					))}
				</div>
				
				{loading && (
					<div className={styles.loadingContainer}>
						<RefreshCw className={styles.spinning} size={24}/>
						<span>{"데이터를 불러오는 중..."}</span>
					</div>
				)}
				
				{!hasMoreData && currentDataLength > 0 && (
					<div className={styles.noMoreData}>{"더 이상 불러올 데이터가 없습니다."}</div>
				)}
				
				{!loading && currentDataLength === 0 && (
					<div className={styles.noData}>
						{keyword ? "검색 결과가 없습니다." : `${tabTitle}이 없습니다.`}
					</div>
				)}
				
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
