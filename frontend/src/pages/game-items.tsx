import React, {useState, useEffect, useCallback} from "react";
import {GameItem, GameItemSearchParams} from "@/types";
import GameItemService from "@/services/game-item-service";
import GameItemCard from "../components/game-item-card";
import {Search, RefreshCw} from "lucide-react";
import styles from "@/assets/styles/game-items.module.scss";

const GameItemsPage:React.FC = () => {
	const [items, setItems] = useState<GameItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasMoreData, setHasMoreData] = useState(true);
	const [currentPage, setCurrentPage] = useState(0);
	const [totalElements, setTotalElements] = useState(0);
	const [keyword, setKeyword] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [sortBy, setSortBy] = useState<string>("itemId");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
	
	// 아이템 로드 함수
	const loadItems = useCallback(async(reset = false) => {
		if(loading || (!hasMoreData && !reset)) return;
		
		setLoading(true);
		try{
			const params:GameItemSearchParams = {
				page : reset ? 0 : currentPage,
				size : 10,
				sortBy,
				sortDir,
				keyword : keyword.trim() || undefined
			};
			
			const response = await GameItemService.getGameItems(params);
			console.log(response);
			
			if(reset){
				setItems(response.content);
				setCurrentPage(1);
			}else{
				setItems(prev => [...prev, ...response.content]);
				setCurrentPage(prev => prev + 1);
			}
			
			setTotalElements(response.totalElements);
			setHasMoreData(!response.last);
		}catch(error){
			console.error("아이템 로드 실패:", error);
		}finally{
			setLoading(false);
		}
	}, [loading, hasMoreData, currentPage, keyword, sortBy, sortDir]);
	
	// 검색 함수
	const handleSearch = () => {
		setKeyword(searchInput);
		setCurrentPage(0);
		setHasMoreData(true);
		setItems([]);
		// loadItems는 keyword가 변경된 후에 useEffect에서 호출됨
	};
	
	// 전체보기 함수
	const handleReset = () => {
		setSearchInput("");
		setKeyword("");
		setCurrentPage(0);
		setHasMoreData(true);
		setItems([]);
	};
	
	// 정렬 변경 함수
	const handleSortChange = (newSortBy:string, newSortDir:"asc" | "desc") => {
		setSortBy(newSortBy);
		setSortDir(newSortDir);
		setCurrentPage(0);
		setHasMoreData(true);
		setItems([]);
	};
	
	// 스크롤 이벤트 핸들러
	const handleScroll = useCallback(() => {
		if(
			window.innerHeight + document.documentElement.scrollTop >=
			document.documentElement.offsetHeight - 1000
		){
			loadItems();
		}
	}, [loadItems]);
	
	// Enter 키 검색
	const handleKeyPress = (e:React.KeyboardEvent) => {
		if(e.key === "Enter"){
			handleSearch();
		}
	};
	
	// 초기 로드 및 검색어/정렬 변경시 로드
	useEffect(() => {
		loadItems(true);
	}, [keyword, sortBy, sortDir]);
	
	// 스크롤 이벤트 등록
	useEffect(() => {
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);
	
	return (
		<div className={styles.gameItemsPage}>
			<div className={styles.pageHeader}>
				<h1>게임 아이템 목록</h1>
				<p className={styles.pageDescription}>
					마비노기 게임 아이템을 검색하고 탐색해보세요
				</p>
			</div>
			
			{/* 검색 및 필터 영역 */}
			<div className={styles.controlsSection}>
				<div className={styles.searchContainer}>
					<div className={styles.searchBox}>
						<Search size={20} className={styles.searchIcon}/>
						<input
							type="text"
							placeholder="아이템 이름으로 검색..."
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
						<option value="itemId-asc">ID 오름차순</option>
						<option value="itemId-desc">ID 내림차순</option>
						<option value="itemName-asc">이름 오름차순</option>
						<option value="itemName-desc">이름 내림차순</option>
						<option value="itemType-asc">타입 오름차순</option>
						<option value="itemType-desc">타입 내림차순</option>
					</select>
				</div>
			</div>
			
			{/* 결과 정보 */}
			<div className={styles.resultsInfo}>
				{keyword ? (
					<p>
						'<strong>{keyword}</strong>' 검색 결과: 총 {totalElements}개 아이템 중 {items.length}개 표시
					</p>
				) : (
					<p>총 {totalElements}개 아이템 중 {items.length}개 표시</p>
				)}
			</div>
			
			{/* 아이템 목록 */}
			<div className={styles.itemsGrid}>
				{items.map((item) => (
					<GameItemCard
						key={item.itemId}
						item={item}
						onClick={(item) => console.log("아이템 클릭:", item)}
					/>
				))}
			</div>
			
			{/* 로딩 인디케이터 */}
			{loading && (
				<div className={styles.loadingContainer}>
					<RefreshCw className={styles.spinning} size={24}/>
					<span>아이템을 불러오는 중...</span>
				</div>
			)}
			
			{/* 더 이상 데이터가 없을 때 */}
			{!hasMoreData && items.length > 0 && (
				<div className={styles.noMoreData}>
					더 이상 불러올 데이터가 없습니다.
				</div>
			)}
			
			{/* 데이터가 없을 때 */}
			{!loading && items.length === 0 && (
				<div className={styles.noData}>
					{keyword ? "검색 결과가 없습니다." : "아이템이 없습니다."}
				</div>
			)}
		</div>
	);
};

export default GameItemsPage;
