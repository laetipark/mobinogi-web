import React, {useState, useEffect, useCallback} from "react";
import {GameItem, GameItemData, LifeBarter, LifeCraft, GameItemSearchParams} from "@/types";
import GameItemService from "@/services/game-item-service";
import {Search, RefreshCw, Package, ArrowRightLeft, Hammer, ChevronDown, ChevronUp} from "lucide-react";
import styles from "./item-search.module.scss";

const ItemSearchPage:React.FC = () => {
	const [searchInput, setSearchInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [itemData, setItemData] = useState<GameItemData | null>(null);

	// 자동완성 관련 상태
	const [suggestions, setSuggestions] = useState<GameItem[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [suggestionsLoading, setSuggestionsLoading] = useState(false);

	// 섹션 접기/펼치기 상태
	const [expandedSections, setExpandedSections] = useState({
		bartersByItem: true,
		bartersByExchange: true,
		crafts: true
	});

	// 자동완성 검색 (디바운스)
	useEffect(() => {
		const timer = setTimeout(async() => {
			if(searchInput.trim().length >= 1){
				setSuggestionsLoading(true);
				try{
					const params:GameItemSearchParams = {
						page: 0,
						size: 10,
						keyword: searchInput.trim()
					};
					const response = await GameItemService.getGameItems(params);
					setSuggestions(response.content);
					setShowSuggestions(true);
				}catch(err){
					setSuggestions([]);
				}finally{
					setSuggestionsLoading(false);
				}
			}else{
				setSuggestions([]);
				setShowSuggestions(false);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [searchInput]);

	// 아이템 검색
	const handleSearch = useCallback(async(itemName:string) => {
		if(!itemName.trim()) return;

		setLoading(true);
		setError(null);
		setShowSuggestions(false);

		try{
			const data = await GameItemService.getItemByName(itemName.trim());
			setItemData(data);
			setSearchInput(data.itemName);
		}catch(err:any){
			setError(err.response?.data?.message || "아이템을 찾을 수 없습니다.");
			setItemData(null);
		}finally{
			setLoading(false);
		}
	}, []);

	// 자동완성 항목 클릭
	const handleSuggestionClick = (item:GameItem) => {
		setSearchInput(item.itemName);
		setShowSuggestions(false);
		handleSearch(item.itemName);
	};

	// Enter 키 검색
	const handleKeyPress = (e:React.KeyboardEvent) => {
		if(e.key === "Enter"){
			handleSearch(searchInput);
		}
	};

	// 초기화
	const handleReset = () => {
		setSearchInput("");
		setItemData(null);
		setError(null);
		setSuggestions([]);
		setShowSuggestions(false);
	};

	// 섹션 토글
	const toggleSection = (section:keyof typeof expandedSections) => {
		setExpandedSections(prev => ({
			...prev,
			[section]: !prev[section]
		}));
	};

	// 물물교환 테이블 렌더링
	const renderBarterTable = (barters:LifeBarter[], title:string, sectionKey:keyof typeof expandedSections) => {
		if(!barters || barters.length === 0) return null;

		return (
			<div className={styles.dataSection}>
				<div className={styles.sectionHeader} onClick={() => toggleSection(sectionKey)}>
					<div className={styles.sectionTitle}>
						<ArrowRightLeft size={20}/>
						<h3>{title}</h3>
						<span className={styles.badge}>{barters.length}</span>
					</div>
					{expandedSections[sectionKey] ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
				</div>

				{expandedSections[sectionKey] && (
					<div className={styles.tableWrapper}>
						<table className={styles.dataTable}>
							<thead>
								<tr>
									<th>지역</th>
									<th>NPC</th>
									<th>제공 아이템</th>
									<th>무게</th>
									<th>교환 아이템</th>
									<th>교환 수량</th>
									<th>수량</th>
									<th>비고</th>
								</tr>
							</thead>
							<tbody>
								{barters.map((barter) => (
									<tr key={barter.barterId}>
										<td>{barter.gameRegion?.regionName || barter.regionId}</td>
										<td>{barter.gameNpc?.npcName || barter.npcId}</td>
										<td className={styles.itemCell}>
											<span
												className={styles.clickableItem}
												onClick={() => barter.gameItem?.itemName && handleSearch(barter.gameItem.itemName)}
											>
												{barter.gameItem?.itemName || barter.itemId}
											</span>
										</td>
										<td>{barter.itemWeight}</td>
										<td className={styles.itemCell}>
											<span
												className={styles.clickableItem}
												onClick={() => barter.exchangeItem?.itemName && handleSearch(barter.exchangeItem.itemName)}
											>
												{barter.exchangeItem?.itemName || barter.exchangeId}
											</span>
										</td>
										<td>{barter.exchangeCost}</td>
										<td>{barter.barterQty}</td>
										<td>{barter.barterEtc || "-"}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		);
	};

	// 제작 테이블 렌더링
	const renderCraftTable = (craftsBySubId:Record<number, LifeCraft[]>) => {
		if(!craftsBySubId || Object.keys(craftsBySubId).length === 0) return null;

		const craftEntries = Object.entries(craftsBySubId);

		return (
			<div className={styles.dataSection}>
				<div className={styles.sectionHeader} onClick={() => toggleSection("crafts")}>
					<div className={styles.sectionTitle}>
						<Hammer size={20}/>
						<h3>제작 정보</h3>
						<span className={styles.badge}>{craftEntries.length}종</span>
					</div>
					{expandedSections.crafts ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
				</div>

				{expandedSections.crafts && (
					<div className={styles.craftGroups}>
						{craftEntries.map(([subId, crafts]) => (
							<div key={subId} className={styles.craftGroup}>
								<div className={styles.craftGroupHeader}>
									<span className={styles.craftSubId}>제작법 #{subId}</span>
								</div>
								<div className={styles.tableWrapper}>
									<table className={styles.dataTable}>
										<thead>
											<tr>
												<th>결과물</th>
												<th>재료</th>
												<th>필요 수량</th>
											</tr>
										</thead>
										<tbody>
											{crafts.map((craft) => (
												<tr key={craft.craftId}>
													<td className={styles.itemCell}>
														<span
															className={styles.clickableItem}
															onClick={() => craft.gameItem?.itemName && handleSearch(craft.gameItem.itemName)}
														>
															{craft.gameItem?.itemName || craft.itemId}
														</span>
													</td>
													<td className={styles.itemCell}>
														<span
															className={styles.clickableItem}
															onClick={() => craft.ingredientItem?.itemName && handleSearch(craft.ingredientItem.itemName)}
														>
															{craft.ingredientItem?.itemName || craft.craftIngredientId}
														</span>
													</td>
													<td>{craft.craftIngredientCost}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className={styles.itemSearchPage}>
			<div className={styles.pageHeader}>
				<h1>아이템 검색</h1>
				<p className={styles.pageDescription}>
					아이템을 검색하여 물물교환, 제작 정보를 확인하세요
				</p>
			</div>

			{/* 검색 영역 */}
			<div className={styles.searchSection}>
				<div className={styles.searchContainer}>
					<div className={styles.searchBox}>
						<Search size={20} className={styles.searchIcon}/>
						<input
							type="text"
							placeholder="아이템 이름을 입력하세요..."
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onKeyPress={handleKeyPress}
							onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
							className={styles.searchInput}
						/>
						{suggestionsLoading && (
							<RefreshCw className={`${styles.loadingIcon} ${styles.spinning}`} size={16}/>
						)}

						{/* 자동완성 드롭다운 */}
						{showSuggestions && suggestions.length > 0 && (
							<div className={styles.suggestionsDropdown}>
								{suggestions.map((item) => (
									<div
										key={item.itemId}
										className={styles.suggestionItem}
										onClick={() => handleSuggestionClick(item)}
									>
										<Package size={16}/>
										<span className={styles.suggestionName}>{item.itemName}</span>
										<span className={styles.suggestionType}>{item.itemType}</span>
									</div>
								))}
							</div>
						)}
					</div>
					<button
						onClick={() => handleSearch(searchInput)}
						className={styles.searchBtn}
						disabled={loading || !searchInput.trim()}
					>
						{loading ? <RefreshCw className={styles.spinning} size={16}/> : "검색"}
					</button>
					<button
						onClick={handleReset}
						className={styles.resetBtn}
						disabled={loading}
					>
						초기화
					</button>
				</div>
			</div>

			{/* 에러 메시지 */}
			{error && (
				<div className={styles.errorMessage}>
					{error}
				</div>
			)}

			{/* 검색 결과 */}
			{itemData && (
				<div className={styles.resultsSection}>
					{/* 아이템 정보 헤더 */}
					<div className={styles.itemInfoHeader}>
						<Package size={24}/>
						<h2>{itemData.itemName}</h2>
					</div>

					{/* 물물교환 - 이 아이템을 제공하는 경우 */}
					{renderBarterTable(
						itemData.bartersByItemId,
						"물물교환 (이 아이템 획득)",
						"bartersByItem"
					)}

					{/* 물물교환 - 이 아이템을 사용하는 경우 */}
					{renderBarterTable(
						itemData.bartersByExchangeId,
						"물물교환 (이 아이템 사용)",
						"bartersByExchange"
					)}

					{/* 제작 정보 */}
					{renderCraftTable(itemData.craftsBySubId)}

					{/* 데이터가 없는 경우 */}
					{(!itemData.bartersByItemId || itemData.bartersByItemId.length === 0) &&
					 (!itemData.bartersByExchangeId || itemData.bartersByExchangeId.length === 0) &&
					 (!itemData.craftsBySubId || Object.keys(itemData.craftsBySubId).length === 0) && (
						<div className={styles.noRelatedData}>
							이 아이템에 대한 물물교환/제작 정보가 없습니다.
						</div>
					)}
				</div>
			)}

			{/* 초기 상태 안내 */}
			{!itemData && !error && !loading && (
				<div className={styles.initialGuide}>
					<Package size={48}/>
					<p>아이템 이름을 검색하면 물물교환, 제작 정보를 확인할 수 있습니다.</p>
				</div>
			)}

			{/* 로딩 상태 */}
			{loading && (
				<div className={styles.loadingContainer}>
					<RefreshCw className={styles.spinning} size={24}/>
					<span>아이템 정보를 불러오는 중...</span>
				</div>
			)}
		</div>
	);
};

export default ItemSearchPage;
