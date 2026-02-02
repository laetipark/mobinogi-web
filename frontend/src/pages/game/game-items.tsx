import React, {useState, useEffect, useCallback} from "react";
import {GameItem, LifeBarter, LifeCraft, ListSearchParams} from "@/types";
import GameItemService from "@/services/game-item-service";
import GameItemCard from "@/components/game/game-item-card";
import BarterCard from "@/components/game/barter-card";
import CraftCard from "@/components/game/craft-card";
import ItemDetailModal from "@/components/game/item-detail-modal";
import {Search, RefreshCw, Package, ArrowLeftRight, Hammer} from "lucide-react";
import styles from "./game-items.module.scss";

type TabType = "items" | "barter" | "craft";

const GameItemsPage:React.FC = () => {
	const [activeTab, setActiveTab] = useState<TabType>("items");
	const [selectedItem, setSelectedItem] = useState<GameItem | null>(null);

	// 아이템 상태
	const [items, setItems] = useState<GameItem[]>([]);
	const [barters, setBarters] = useState<LifeBarter[]>([]);
	const [crafts, setCrafts] = useState<LifeCraft[]>([]);

	const [loading, setLoading] = useState(false);
	const [hasMoreData, setHasMoreData] = useState(true);
	const [currentPage, setCurrentPage] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const [keyword, setKeyword] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [sortBy, setSortBy] = useState<string>("itemId");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

	// 탭별 정렬 옵션
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

	// 기본 정렬 설정
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

	// 데이터 로드 함수
	const loadData = useCallback(async(reset = false) => {
		if(loading || (!hasMoreData && !reset)) return;

		setLoading(true);
		try{
			const params:ListSearchParams = {
				page: reset ? 0 : currentPage,
				size: 10,
				sortBy,
				sortDir,
				keyword: keyword.trim() || undefined
			};

			if(activeTab === "items"){
				const response = await GameItemService.getGameItems(params);
				if(reset){
					setItems(response.content);
					setCurrentPage(1);
				}else{
					setItems(prev => [...prev, ...response.content]);
					setCurrentPage(prev => prev + 1);
				}
				setTotalElements(response.totalElements);
				setHasMoreData(!response.last);
			}else if(activeTab === "barter"){
				const response = await GameItemService.getBarters(params);
				if(reset){
					setBarters(response.content);
					setCurrentPage(1);
				}else{
					setBarters(prev => [...prev, ...response.content]);
					setCurrentPage(prev => prev + 1);
				}
				setTotalElements(response.totalElements);
				setHasMoreData(!response.last);
			}else if(activeTab === "craft"){
				const response = await GameItemService.getCrafts(params);
				if(reset){
					setCrafts(response.content);
					setCurrentPage(1);
				}else{
					setCrafts(prev => [...prev, ...response.content]);
					setCurrentPage(prev => prev + 1);
				}
				setTotalElements(response.totalElements);
				setHasMoreData(!response.last);
			}
		}catch(error){
			console.error("데이터 로드 실패:", error);
		}finally{
			setLoading(false);
		}
	}, [loading, hasMoreData, currentPage, keyword, sortBy, sortDir, activeTab]);

	// 탭 변경 핸들러
	const handleTabChange = (tab:TabType) => {
		if(tab === activeTab) return;

		setActiveTab(tab);
		const defaultSort = getDefaultSort(tab);
		setSortBy(defaultSort.sortBy);
		setSortDir(defaultSort.sortDir);
		setSearchInput("");
		setKeyword("");
		setCurrentPage(0);
		setHasMoreData(true);
		setItems([]);
		setBarters([]);
		setCrafts([]);
	};

	// 검색 함수
	const handleSearch = () => {
		setKeyword(searchInput);
		setCurrentPage(0);
		setHasMoreData(true);
		setItems([]);
		setBarters([]);
		setCrafts([]);
	};

	// 전체보기 함수
	const handleReset = () => {
		setSearchInput("");
		setKeyword("");
		setCurrentPage(0);
		setHasMoreData(true);
		setItems([]);
		setBarters([]);
		setCrafts([]);
	};

	// 정렬 변경 함수
	const handleSortChange = (newSortBy:string, newSortDir:"asc" | "desc") => {
		setSortBy(newSortBy);
		setSortDir(newSortDir);
		setCurrentPage(0);
		setHasMoreData(true);
		setItems([]);
		setBarters([]);
		setCrafts([]);
	};

	// 스크롤 이벤트 핸들러
	const handleScroll = useCallback(() => {
		if(
			window.innerHeight + document.documentElement.scrollTop >=
			document.documentElement.offsetHeight - 1000
		){
			loadData();
		}
	}, [loadData]);

	// Enter 키 검색
	const handleKeyPress = (e:React.KeyboardEvent) => {
		if(e.key === "Enter"){
			handleSearch();
		}
	};

	// 초기 로드 및 검색어/정렬 변경시 로드
	useEffect(() => {
		loadData(true);
	}, [keyword, sortBy, sortDir, activeTab]);

	// 스크롤 이벤트 등록
	useEffect(() => {
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	// 현재 탭의 데이터 개수
	const getCurrentDataLength = () => {
		switch(activeTab){
			case "items":
				return items.length;
			case "barter":
				return barters.length;
			case "craft":
				return crafts.length;
		}
	};

	// 탭 제목
	const getTabTitle = () => {
		switch(activeTab){
			case "items":
				return "게임 아이템";
			case "barter":
				return "물물교환";
			case "craft":
				return "제작";
		}
	};

	return (
		<div className={styles.gameItemsPage}>
			<div className={styles.pageHeader}>
				<h1>게임 데이터</h1>
				<p className={styles.pageDescription}>
					마비노기 게임 아이템, 물물교환, 제작 정보를 탐색해보세요
				</p>
			</div>

			{/* 탭 네비게이션 */}
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

			{/* 검색 및 필터 영역 */}
			<div className={styles.controlsSection}>
				<div className={styles.searchContainer}>
					<div className={styles.searchBox}>
						<Search size={20} className={styles.searchIcon}/>
						<input
							type="text"
							placeholder={`${getTabTitle()} 이름으로 검색...`}
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onKeyPress={handleKeyPress}
							className={styles.searchInput}
						/>
					</div>
					<button
						onClick={handleSearch}
						className={styles.searchBtn}
						disabled={loading}
					>
						{loading ? <RefreshCw className={styles.spinning} size={16}/> : "검색"}
					</button>
					<button
						onClick={handleReset}
						className={styles.resetBtn}
						disabled={loading}
					>
						전체보기
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
						{getSortOptions().map(option => (
							<option key={option.value} value={option.value}>{option.label}</option>
						))}
					</select>
				</div>
			</div>

			{/* 결과 정보 */}
			<div className={styles.resultsInfo}>
				{keyword ? (
					<p>
						'<strong>{keyword}</strong>' 검색 결과: 총 {totalElements}개 {getTabTitle()} 중 {getCurrentDataLength()}개 표시
					</p>
				) : (
					<p>총 {totalElements}개 {getTabTitle()} 중 {getCurrentDataLength()}개 표시</p>
				)}
			</div>

			{/* 아이템 목록 */}
			<div className={styles.itemsGrid}>
				{activeTab === "items" && items.map((item) => (
					<GameItemCard
						key={item.itemId}
						item={item}
						onClick={(item) => setSelectedItem(item)}
					/>
				))}
				{activeTab === "barter" && barters.map((barter) => (
					<BarterCard
						key={barter.barterId}
						barter={barter}
						onClick={(barter) => barter.gameItem && setSelectedItem(barter.gameItem)}
					/>
				))}
				{activeTab === "craft" && crafts.map((craft) => (
					<CraftCard
						key={`${craft.craftId}-${craft.craftSubId}`}
						craft={craft}
						onClick={(craft) => craft.gameItem && setSelectedItem(craft.gameItem)}
					/>
				))}
			</div>

			{/* 로딩 인디케이터 */}
			{loading && (
				<div className={styles.loadingContainer}>
					<RefreshCw className={styles.spinning} size={24}/>
					<span>데이터를 불러오는 중...</span>
				</div>
			)}

			{/* 더 이상 데이터가 없을 때 */}
			{!hasMoreData && getCurrentDataLength() > 0 && (
				<div className={styles.noMoreData}>
					더 이상 불러올 데이터가 없습니다.
				</div>
			)}

			{/* 데이터가 없을 때 */}
			{!loading && getCurrentDataLength() === 0 && (
				<div className={styles.noData}>
					{keyword ? "검색 결과가 없습니다." : `${getTabTitle()}이 없습니다.`}
				</div>
			)}

			{/* 아이템 상세 모달 */}
			{selectedItem && (
				<ItemDetailModal
					item={selectedItem}
					onClose={() => setSelectedItem(null)}
				/>
			)}
		</div>
	);
};

export default GameItemsPage;
