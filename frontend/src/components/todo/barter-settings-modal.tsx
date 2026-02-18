import React, {useState, useEffect, useRef, useCallback, useMemo} from "react";
import styles from "./todo.module.scss";
import {LifeBarter, UserTodoBarter} from "@/types";
import {GameItemService} from "@/services/game-item-service.ts";
import {todoService} from "@/services/todo-service.ts";
import {ArrowRight, Search, RefreshCw} from "lucide-react";
import type {BarterSettingsModalProps} from "@/types/ui";

const barterBaseKey = (itemName:string, exchangeItemName:string) =>
	`${itemName}|${exchangeItemName}`;

const barterNpcKey = (itemName:string, exchangeItemName:string, npcName:string) =>
	`${itemName}|${exchangeItemName}|${npcName}`;

const isNpcShared = (barterNpc?:number) => Boolean(barterNpc);

const BarterSettingsModal:React.FC<BarterSettingsModalProps> = ({
	characterId,
	cycle,
	cycleLabel,
	existingBarters,
	favoriteItems,
	onUpdate,
	onClose
}) => {
	const [searchInput, setSearchInput] = useState("");
	const [keyword, setKeyword] = useState("");
	const [searchResults, setSearchResults] = useState<LifeBarter[]>([]);
	const [loading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [totalElements, setTotalElements] = useState(0);
	const [recommendations, setRecommendations] = useState<LifeBarter[]>([]);
	const [recommendationLoading, setRecommendationLoading] = useState(false);
	const listRef = useRef<HTMLDivElement>(null);
	const favoriteItemNames = useMemo(
		() => [...new Set((favoriteItems || []).map(item => item.itemName.trim()).filter(Boolean))],
		[favoriteItems]
	);
	
	const existingBarterLookup = useMemo(() => {
		const baseKeys = new Set<string>();
		const sharedBaseKeys = new Set<string>();
		const npcKeys = new Set<string>();

		for(const barter of existingBarters){
			const itemName = barter.itemName || "";
			const exchangeItemName = barter.exchangeItemName || "";
			const npcName = barter.npcName || "";
			const baseKey = barterBaseKey(itemName, exchangeItemName);
			baseKeys.add(baseKey);
			if(isNpcShared(barter.barterNpc)){
				sharedBaseKeys.add(baseKey);
			}else{
				npcKeys.add(barterNpcKey(itemName, exchangeItemName, npcName));
			}
		}

		return {
			baseKeys,
			sharedBaseKeys,
			npcKeys
		};
	}, [existingBarters]);

	const isBarterRegistered = useCallback((barter:LifeBarter) => {
		const itemName = barter.gameItem?.itemName || "";
		const exchangeItemName = barter.exchangeItem?.itemName || "";
		const npcName = barter.gameNpc?.npcName || "";
		const baseKey = barterBaseKey(itemName, exchangeItemName);

		if(isNpcShared(barter.barterNpc)){
			return existingBarterLookup.baseKeys.has(baseKey);
		}

		return existingBarterLookup.sharedBaseKeys.has(baseKey)
			|| existingBarterLookup.npcKeys.has(barterNpcKey(itemName, exchangeItemName, npcName));
	}, [existingBarterLookup]);

	const findRegisteredBarter = useCallback((barter:LifeBarter) => {
		const itemName = barter.gameItem?.itemName || "";
		const exchangeItemName = barter.exchangeItem?.itemName || "";
		const npcName = barter.gameNpc?.npcName || "";
		const candidateBaseKey = barterBaseKey(itemName, exchangeItemName);
		const candidateNpcShared = isNpcShared(barter.barterNpc);

		return existingBarters.find((currentBarter) => {
			const currentItemName = currentBarter.itemName || "";
			const currentExchangeItemName = currentBarter.exchangeItemName || "";
			const currentNpcName = currentBarter.npcName || "";
			const currentBaseKey = barterBaseKey(currentItemName, currentExchangeItemName);
			if(currentBaseKey !== candidateBaseKey){
				return false;
			}
			if(candidateNpcShared || isNpcShared(currentBarter.barterNpc)){
				return true;
			}
			return currentNpcName === npcName;
		});
	}, [existingBarters]);
	const {availableSearchResults, registeredSearchResults} = useMemo(() => {
		const available:LifeBarter[] = [];
		const registered:LifeBarter[] = [];
		for(const barter of searchResults){
			if(isBarterRegistered(barter)){
				registered.push(barter);
			}else{
				available.push(barter);
			}
		}
		return {
			availableSearchResults : available,
			registeredSearchResults : registered
		};
	}, [searchResults, isBarterRegistered]);
	const recommendedAvailableResults = useMemo(() => {
		const recommended:LifeBarter[] = [];
		const seen = new Set<string>();
		for(const barter of recommendations){
			const iName = barter.gameItem?.itemName || "";
			const eName = barter.exchangeItem?.itemName || "";
			const nName = barter.gameNpc?.npcName || "";
			const key = isNpcShared(barter.barterNpc)
				? barterBaseKey(iName, eName)
				: barterNpcKey(iName, eName, nName);
			if(isBarterRegistered(barter) || seen.has(key)){
				continue;
			}
			seen.add(key);
			recommended.push(barter);
		}
		return recommended;
	}, [recommendations, isBarterRegistered]);
	const mergedAvailableResults = useMemo(() => {
		const merged:{barter:LifeBarter; source:"recommend" | "available"}[] = [];
		const seen = new Set<string>();
		for(const barter of recommendedAvailableResults){
			const iName = barter.gameItem?.itemName || "";
			const eName = barter.exchangeItem?.itemName || "";
			const nName = barter.gameNpc?.npcName || "";
			const key = isNpcShared(barter.barterNpc)
				? barterBaseKey(iName, eName)
				: barterNpcKey(iName, eName, nName);
			if(seen.has(key)){
				continue;
			}
			seen.add(key);
			merged.push({barter, source : "recommend"});
		}
		for(const barter of availableSearchResults){
			const iName = barter.gameItem?.itemName || "";
			const eName = barter.exchangeItem?.itemName || "";
			const nName = barter.gameNpc?.npcName || "";
			const key = isNpcShared(barter.barterNpc)
				? barterBaseKey(iName, eName)
				: barterNpcKey(iName, eName, nName);
			if(seen.has(key)){
				continue;
			}
			seen.add(key);
			merged.push({barter, source : "available"});
		}
		return merged;
	}, [recommendedAvailableResults, availableSearchResults]);
	const hasFavoriteRecommendations = favoriteItemNames.length > 0;
	const hasAnyVisibleItem = mergedAvailableResults.length > 0 || registeredSearchResults.length > 0;
	const shouldShowEmpty = !loading && !hasAnyVisibleItem && !(hasFavoriteRecommendations && recommendationLoading);
	
	// 검색어 debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			setKeyword(searchInput);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput]);
	
	const loadData = useCallback(async(reset = false) => {
		if(loading || (!hasMore && !reset)) return;
		
		setLoading(true);
		try{
			const page = reset ? 0 : currentPage;
			const result = await GameItemService.getBarters({
				keyword : keyword.trim() || undefined,
				page,
				size : 20,
				searchMode : "obtained",
				cycle
			});
			
			if(reset){
				setSearchResults(result.content);
				setCurrentPage(1);
			}else{
				setSearchResults(prev => [...prev, ...result.content]);
				setCurrentPage(prev => prev + 1);
			}
			setTotalElements(result.totalElements);
			setHasMore(!result.last);
		}catch(err){
			console.error("Failed to search barters:", err);
		}finally{
			setLoading(false);
		}
	}, [loading, hasMore, currentPage, keyword, cycle]);
	
	useEffect(() => {
		setSearchResults([]);
		setCurrentPage(0);
		setHasMore(true);
		loadData(true);
	}, [keyword]);

	useEffect(() => {
		let active = true;
		const loadRecommendations = async() => {
			if(favoriteItemNames.length === 0){
				setRecommendations([]);
				return;
			}
			setRecommendationLoading(true);
			try{
				const responses = await Promise.allSettled(
					favoriteItemNames.map(async(itemName) => {
						const result = await GameItemService.getBarters({
							keyword : itemName,
							page : 0,
							size : 30,
							searchMode : "obtained",
							cycle
						});
						return {itemName, result};
					})
				);
				if(!active) return;
				const seen = new Set<string>();
				const merged:LifeBarter[] = [];
				for(const response of responses){
					if(response.status !== "fulfilled"){
						continue;
					}
					const {itemName, result} = response.value;
					for(const barter of result.content){
						const obtainedItemName = barter.gameItem?.itemName;
						if(!obtainedItemName || obtainedItemName !== itemName){
							continue;
						}
						const exchangeItemName = barter.exchangeItem?.itemName || "";
						const npcName = barter.gameNpc?.npcName || "";
						const key = isNpcShared(barter.barterNpc)
							? barterBaseKey(obtainedItemName, exchangeItemName)
							: barterNpcKey(obtainedItemName, exchangeItemName, npcName);
						if(seen.has(key)){
							continue;
						}
						seen.add(key);
						merged.push(barter);
					}
				}
				setRecommendations(merged);
			}catch(err){
				console.error("Failed to load barter recommendations:", err);
				if(active){
					setRecommendations([]);
				}
			}finally{
				if(active){
					setRecommendationLoading(false);
				}
			}
		};
		loadRecommendations();
		return () => {
			active = false;
		};
	}, [favoriteItemNames, cycle]);
	
	const handleScroll = useCallback(() => {
		const el = listRef.current;
		if(!el) return;
		if(el.scrollTop + el.clientHeight >= el.scrollHeight - 200){
			loadData();
		}
	}, [loadData]);
	
	useEffect(() => {
		const el = listRef.current;
		if(!el) return;
		el.addEventListener("scroll", handleScroll);
		return () => el.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);
	
	const handleSearch = () => {
		setKeyword(searchInput);
	};
	
	const handleReset = () => {
		setSearchInput("");
		setKeyword("");
	};
	
	const handleKeyPress = (e:React.KeyboardEvent) => {
		if(e.key === "Enter") handleSearch();
	};
	
	const handleAdd = async(barter:LifeBarter) => {
		const iName = barter.gameItem?.itemName || "";
		const eName = barter.exchangeItem?.itemName || "";
		const nName = barter.gameNpc?.npcName || "";
		const rName = barter.gameRegion?.regionName || "";
		try{
			const barterCycle = cycle === 1 ? "daily" : "weekly";
			const added = await todoService.addBarterItem(characterId, iName, eName, nName, rName, barter.exchangeCost, barterCycle);
			const enriched:UserTodoBarter = {
				...added,
				barterQty : added.barterQty ?? barter.barterQty,
				barterInitCycle : added.barterInitCycle ?? cycle
			};
			const next = [...existingBarters];
			const existingIndex = next.findIndex(item => item.id === enriched.id);
			if(existingIndex >= 0){
				next[existingIndex] = {...next[existingIndex], ...enriched};
			}else{
				next.push(enriched);
			}
			onUpdate(next);
		}catch(err){
			console.error("Failed to add barter:", err);
		}
	};
	
	const handleRemove = async(barter:LifeBarter) => {
		const existing = findRegisteredBarter(barter);
		if(!existing) return;
		try{
			await todoService.removeBarterItem(characterId, existing.id);
			onUpdate(existingBarters.filter(b => b.id !== existing.id));
		}catch(err){
			console.error("Failed to remove barter:", err);
		}
	};

	const handleRemoveAddedBarter = async(barterId:number) => {
		try{
			await todoService.removeBarterItem(characterId, barterId);
			onUpdate(existingBarters.filter(b => b.id !== barterId));
		}catch(err){
			console.error("Failed to remove barter:", err);
		}
	};

	const renderBarterCard = (barter:LifeBarter, keyPrefix:string) => {
		const iName = barter.gameItem?.itemName || "";
		const eName = barter.exchangeItem?.itemName || "";
		const nName = barter.gameNpc?.npcName || "";
		const isAdded = isBarterRegistered(barter);
		return (
			<div
				key={`${keyPrefix}-${barter.barterId}-${iName}-${eName}-${nName}`}
				className={`${styles.barterSettingsCard} ${isAdded ? styles.registered : ""}`}
			>
				<div className={styles.barterCardHeader}>
					<span className={styles.barterCardLocation}>
						{barter.gameRegion?.regionName || "N/A"} - {barter.gameNpc?.npcName || "N/A"}
					</span>
					<button
						className={`${styles.barterToggleBtn} ${isAdded ? styles.remove : styles.add}`}
						onClick={() => isAdded ? handleRemove(barter) : handleAdd(barter)}
					>
						{isAdded ? "제거" : "추가"}
					</button>
				</div>
				<div className={styles.barterCardExchange}>
					<div className={styles.barterCardItem}>
						<span className={styles.barterCardLabel}>교환</span>
						<span className={styles.barterCardValue}>{barter.exchangeItem?.itemName || "N/A"}</span>
						<span className={styles.barterCardQty}>x{barter.exchangeCost}</span>
					</div>
					<ArrowRight size={20} className={styles.barterCardArrow}/>
					<div className={styles.barterCardItem}>
						<span className={styles.barterCardLabel}>획득</span>
						<span className={styles.barterCardValue}>{barter.gameItem?.itemName || "N/A"}</span>
						<span className={styles.barterCardQty}>x{barter.barterQty}</span>
					</div>
				</div>
				{(barter.barterServer || barter.barterNpc) && (
					<div className={styles.barterCardNote}>
						{barter.barterServer && <span>서버 공유</span>}
						{barter.barterServer && barter.barterNpc && <span> / </span>}
						{barter.barterNpc && <span>NPC 공유</span>}
					</div>
				)}
			</div>
		);
	};
	
	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.barterSettingsModal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h3>{cycleLabel} 설정</h3>
					<button className={styles.modalClose} onClick={onClose}>&times;</button>
				</div>
				<div className={styles.barterSearchBar}>
					<div className={styles.barterSearchBox}>
						<Search size={18} className={styles.barterSearchIcon}/>
						<input
							type="text"
							placeholder="획득 아이템 이름으로 검색..."
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onKeyPress={handleKeyPress}
							autoFocus
						/>
					</div>
					<button onClick={handleSearch} className={styles.barterSearchBtn} disabled={loading}>
						{loading ? <RefreshCw className={styles.spinning} size={16}/> : "검색"}
					</button>
					<button onClick={handleReset} className={styles.barterResetBtn} disabled={loading}>
						전체
					</button>
				</div>
				<div className={styles.barterResultInfo}>
					{keyword ? (
						<span>'<strong>{keyword}</strong>' 검색 결과: {totalElements}개</span>
					) : (
						<span>전체 {totalElements}개</span>
					)}
					<span className={styles.barterRegisteredCount}>{existingBarters.length}개 등록됨</span>
				</div>
				<div className={styles.barterCardList} ref={listRef}>
					{(mergedAvailableResults.length > 0 || (hasFavoriteRecommendations && recommendationLoading)) && (
						<div className={styles.barterListSection}>
							<div className={styles.barterListSectionTitle}>추가 가능 아이템 ({mergedAvailableResults.length})</div>
							{hasFavoriteRecommendations && (
								<div className={styles.barterListSectionTitle}>
									{recommendationLoading ? "즐겨찾기 추천 불러오는 중..." : `즐겨찾기 추천 ${recommendedAvailableResults.length}개 포함`}
								</div>
							)}
							{mergedAvailableResults.map(({barter, source}) => renderBarterCard(barter, source))}
						</div>
					)}
					{registeredSearchResults.length > 0 && (
						<div className={styles.barterListSection}>
							<div className={styles.barterListSectionTitle}>등록된 아이템 ({registeredSearchResults.length})</div>
							{registeredSearchResults.map(barter => renderBarterCard(barter, "registered"))}
						</div>
					)}
					
					{loading && (
						<div className={styles.barterLoadingMore}>
							<RefreshCw className={styles.spinning} size={18}/>
							<span>불러오는 중...</span>
						</div>
					)}
					
					{!loading && !hasMore && searchResults.length > 0 && (
						<div className={styles.barterEndMessage}>더 이상 데이터가 없습니다.</div>
					)}
					
					{shouldShowEmpty && (
						<div className={styles.emptyMessage}>
							{keyword ? "검색 결과가 없습니다." : "물물교환 데이터가 없습니다."}
						</div>
					)}
				</div>
				{existingBarters.length > 0 && (
					<div className={styles.abyssPreview}>
						<div className={styles.abyssPreviewGrid}>
							{existingBarters.map(barter => (
								<div key={barter.id} className={styles.abyssPreviewCard}>
									<div className={styles.abyssPreviewInfo}>
										<span className={styles.abyssPreviewName}>{barter.itemName}</span>
										<span className={styles.abyssPreviewRegion}>
											{barter.regionName || "N/A"} - {barter.npcName || "N/A"}
										</span>
										<span className={styles.abyssPreviewDiff}>
											{barter.exchangeItemName} x{barter.exchangeCost}
										</span>
									</div>
									<button className={styles.abyssPreviewRemove} onClick={() => handleRemoveAddedBarter(barter.id)}>
										&times;
									</button>
								</div>
							))}
						</div>
					</div>
				)}
				<div className={styles.modalFooter}>
					<button className={styles.modalSaveBtn} onClick={onClose}>닫기</button>
				</div>
			</div>
		</div>
	);
};

export default BarterSettingsModal;
