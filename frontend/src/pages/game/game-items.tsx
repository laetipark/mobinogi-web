import React, {useState, useEffect, useCallback, useMemo, useRef} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {GameItem, GameItemSummary, LifeBarter, LifeCraft, ListSearchParams} from "@/types";
import GameItemService from "@/services/game-item-service";
import GameItemCard from "@/components/game/game-item-card";
import BarterCard from "@/components/game/barter-card";
import CraftCard from "@/components/game/craft-card";
import ItemDetailModal from "@/components/game/item-detail-modal";
import {Search, RefreshCw, Package, ArrowLeftRight, Hammer} from "lucide-react";
import {getItemRarityInfo} from "@/utils";
import styles from "./game-items.module.scss";

type TabType = "items" | "barter" | "craft";

const DEFAULT_ITEM_RARITY_OPTIONS = ["일반", "고급", "레어", "엘리트", "에픽", "전설", "신화", "유니크"];

const GameItemsPage:React.FC = () => {
	const navigate = useNavigate();
	const {itemName: paramItemName} = useParams<{itemName:string}>();
	const decodedItemName = paramItemName ? decodeURIComponent(paramItemName) : null;

	const [selectedItem, setSelectedItem] = useState<GameItem | GameItemSummary | null>(null);
	const [activeTab, setActiveTab] = useState<TabType>("items");

	const [items, setItems] = useState<GameItemSummary[]>([]);
	const [barters, setBarters] = useState<LifeBarter[]>([]);
	const [crafts, setCrafts] = useState<LifeCraft[]>([]);

	const [loading, setLoading] = useState(false);
	const [hasMoreData, setHasMoreData] = useState(true);
	const [, setCurrentPage] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const [keyword, setKeyword] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [sortBy, setSortBy] = useState<string>("itemId");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
	const [itemTypeOptions, setItemTypeOptions] = useState<string[]>([]);
	const [selectedItemType, setSelectedItemType] = useState("");
	const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
	const [availableRarities, setAvailableRarities] = useState<string[]>(DEFAULT_ITEM_RARITY_OPTIONS);
	const inFlightRef = useRef(false);
	const currentPageRef = useRef(0);
	const hasMoreDataRef = useRef(true);

	useEffect(() => {
		if(decodedItemName && !selectedItem){
			setSelectedItem({itemName: decodedItemName} as GameItemSummary);
		}
		if(!decodedItemName){
			setSelectedItem(null);
		}
	}, [decodedItemName, selectedItem]);

	useEffect(() => {
		const timer = setTimeout(() => {
			setKeyword(searchInput.trim());
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

	useEffect(() => {
		if(activeTab !== "items"){
			return;
		}

		const fetchFilterOptions = async() => {
			try{
				const response = await GameItemService.getGameItemFilterOptions();
				setItemTypeOptions(response.itemTypes || []);
				const normalizedRarities = Array.from(new Set((response.itemRarities || []).map((rarity) => getItemRarityInfo(rarity).label)));
				const mergedRarities = DEFAULT_ITEM_RARITY_OPTIONS.filter((rarity) => normalizedRarities.includes(rarity));
				const extraRarities = normalizedRarities.filter((rarity) => !mergedRarities.includes(rarity));
				setAvailableRarities(mergedRarities.length > 0 ? [...mergedRarities, ...extraRarities] : DEFAULT_ITEM_RARITY_OPTIONS);
			}catch(error){
				console.error("아이템 필터 옵션 로드 실패:", error);
			}
		};

		fetchFilterOptions();
	}, [activeTab]);

	const getSortOptions = () => {
		switch(activeTab){
			case "items":
				return [
					{value: "itemId-asc", label: "ID 오름차순"},
					{value: "itemId-desc", label: "ID 내림차순"},
					{value: "itemName-asc", label: "이름 오름차순"},
					{value: "itemName-desc", label: "이름 내림차순"},
					{value: "itemType-asc", label: "타입 오름차순"},
					{value: "itemType-desc", label: "타입 내림차순"}
				];
			case "barter":
				return [
					{value: "barterId-asc", label: "ID 오름차순"},
					{value: "barterId-desc", label: "ID 내림차순"},
					{value: "regionId-asc", label: "지역 오름차순"},
					{value: "regionId-desc", label: "지역 내림차순"}
				];
			case "craft":
				return [
					{value: "craftId-asc", label: "ID 오름차순"},
					{value: "craftId-desc", label: "ID 내림차순"},
					{value: "itemId-asc", label: "아이템ID 오름차순"},
					{value: "itemId-desc", label: "아이템ID 내림차순"}
				];
		}
	};

	const getDefaultSort = (tab:TabType) => {
		switch(tab){
			case "items":
				return {sortBy: "itemId", sortDir: "asc" as const};
			case "barter":
				return {sortBy: "barterId", sortDir: "asc" as const};
			case "craft":
				return {sortBy: "craftId", sortDir: "asc" as const};
		}
	};

	const loadData = useCallback(async(reset = false) => {
		if(inFlightRef.current || (!hasMoreDataRef.current && !reset)){
			return;
		}

		inFlightRef.current = true;
		setLoading(true);

		try{
			const params:ListSearchParams & {itemType?:string; itemRarity?:string[]} = {
				page : reset ? 0 : currentPageRef.current,
				size : 10,
				sortBy,
				sortDir,
				keyword : keyword || undefined
			};

			if(activeTab === "items"){
				params.itemType = selectedItemType || undefined;
				params.itemRarity = selectedRarities.length > 0 ? selectedRarities : undefined;
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
	}, [activeTab, keyword, selectedItemType, selectedRarities, sortBy, sortDir]);

	const resetPagingState = () => {
		currentPageRef.current = 0;
		hasMoreDataRef.current = true;
		setCurrentPage(0);
		setHasMoreData(true);
		setItems([]);
		setBarters([]);
		setCrafts([]);
	};

	const handleTabChange = (tab:TabType) => {
		if(tab === activeTab){
			return;
		}

		setActiveTab(tab);
		const defaultSort = getDefaultSort(tab);
		setSortBy(defaultSort.sortBy);
		setSortDir(defaultSort.sortDir);
		setSearchInput("");
		setKeyword("");
		setSelectedItemType("");
		setSelectedRarities([]);
		resetPagingState();
	};

	const handleSearch = () => {
		setKeyword(searchInput.trim());
		resetPagingState();
	};

	const handleReset = () => {
		setSearchInput("");
		setKeyword("");
		setSelectedItemType("");
		setSelectedRarities([]);
		resetPagingState();
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
		loadData(true);
	}, [activeTab, keyword, sortBy, sortDir, selectedItemType, selectedRarities, loadData]);

	useEffect(() => {
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

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
				return "게임 아이템";
			case "barter":
				return "물물교환";
			case "craft":
				return "제작";
		}
	}, [activeTab]);

	return (
		<div className={styles.gameItemsPage}>
			<div className={styles.container}>
				<div className="oYV5kUSv">
					<h1>게임 데이터</h1>
					<p className="-v1-aGH7">마비노기 게임 아이템, 물물교환, 제작 정보를 탐색해보세요</p>
				</div>

				<div className={styles.tabContainer}>
					<button
						className={`${styles.tabButton} ${activeTab === "items" ? styles.active : ""}`}
						onClick={() => handleTabChange("items")}
					>
						<Package size={18}/>
						<span>아이템</span>
					</button>
					<button
						className={`${styles.tabButton} ${activeTab === "barter" ? styles.active : ""}`}
						onClick={() => handleTabChange("barter")}
					>
						<ArrowLeftRight size={18}/>
						<span>물물교환</span>
					</button>
					<button
						className={`${styles.tabButton} ${activeTab === "craft" ? styles.active : ""}`}
						onClick={() => handleTabChange("craft")}
					>
						<Hammer size={18}/>
						<span>제작</span>
					</button>
				</div>

				<div className={styles.controlsSection}>
					<div className={styles.searchContainer}>
						<div className={styles.searchBox}>
							<Search size={20} className={styles.searchIcon}/>
							<input
								type="text"
								placeholder={`${tabTitle} 이름으로 검색...`}
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								onKeyPress={handleKeyPress}
								className={styles.searchInput}
							/>
						</div>
						<button onClick={handleSearch} className={styles.searchBtn} disabled={loading}>
							{loading ? <RefreshCw className={styles.spinning} size={16}/> : "검색"}
						</button>
						<button onClick={handleReset} className={styles.resetBtn} disabled={loading}>
							전체 보기
						</button>
					</div>

					<div className={styles.sortContainer}>
						<label>정렬:</label>
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

					{activeTab === "items" && (
						<div className={styles.filtersSection}>
							<div className={styles.itemTypeFilter}>
								<label htmlFor="item-type-filter">아이템 타입</label>
								<select
									id="item-type-filter"
									value={selectedItemType}
									onChange={(e) => {
										setSelectedItemType(e.target.value);
										resetPagingState();
									}}
									className={styles.filterSelect}
								>
									<option value="">전체</option>
									{itemTypeOptions.map((itemType) => (
										<option key={itemType} value={itemType}>{itemType}</option>
									))}
								</select>
							</div>

							<div className={styles.itemRarityFilter}>
								<span className={styles.rarityLabel}>아이템 등급</span>
								<div className={styles.rarityOptions}>
									{availableRarities.map((rarity) => {
										const rarityInfo = getItemRarityInfo(rarity);
										const checked = selectedRarities.includes(rarity);
										return (
											<label key={rarity} className={`${styles.rarityOption} ${checked ? styles.selected : ""}`}>
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
				</div>

				<div className={styles.resultsInfo}>
					{keyword ? (
						<p>
							'<strong>{keyword}</strong>' 검색 결과: 총 {totalElements}개 {tabTitle} 중 {currentDataLength}개 표시
						</p>
					) : (
						<p>총 {totalElements}개 {tabTitle} 중 {currentDataLength}개 표시</p>
					)}
				</div>

				<div className={styles.itemsGrid}>
					{activeTab === "items" && items.map((item) => (
						<GameItemCard
							key={item.itemId}
							item={item}
							onClick={(clickedItem) => {
								setSelectedItem(clickedItem);
								navigate(`/items/${encodeURIComponent(clickedItem.itemName)}/detail`);
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
									navigate(`/items/${encodeURIComponent(clickedBarter.gameItem.itemName)}/detail`);
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
									navigate(`/items/${encodeURIComponent(targetName)}/detail`);
								}
							}}
						/>
					))}
				</div>

				{loading && (
					<div className={styles.loadingContainer}>
						<RefreshCw className={styles.spinning} size={24}/>
						<span>데이터를 불러오는 중...</span>
					</div>
				)}

				{!hasMoreData && currentDataLength > 0 && (
					<div className={styles.noMoreData}>더 이상 불러올 데이터가 없습니다.</div>
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
							navigate("/items");
						}}
					/>
				)}
			</div>
		</div>
	);
};

export default GameItemsPage;
