import React, {useState, useEffect, useRef, useCallback, useMemo} from "react";
import styles from "./todo.module.scss";
import {LifeBarter, UserTodoBarter} from "@/types";
import {GameItemService} from "@/services/game-item-service.ts";
import {todoService} from "@/services/todo-service.ts";
import {ArrowRight, Search, RefreshCw, MapPin, User} from "lucide-react";
import type {BarterSettingsModalProps} from "@/types/ui";

const barterBaseKey = (itemName:string, exchangeItemName:string) =>
	`${itemName}|${exchangeItemName}`;

const barterNpcKey = (itemName:string, exchangeItemName:string, npcName:string) =>
	`${itemName}|${exchangeItemName}|${npcName}`;

const isNpcShared = (barterNpc?:number) => Boolean(barterNpc);

const toSafeBarterCount = (value:unknown):number => {
	const parsed = Number(value);
	if(!Number.isFinite(parsed) || parsed < 0){
		return 0;
	}
	return Math.trunc(parsed);
};

const normalizeItemName = (value:string | undefined):string =>
	(value || "").replace(/\s+/g, "").replace(/＋/g, "+").trim().toLowerCase();

const isNormalizedItemNameMatch = (candidate:string, target:string):boolean => {
	if(!candidate || !target){
		return false;
	}
	return candidate === target
		|| candidate.includes(target)
		|| target.includes(candidate);
};

const getBarterIdentityKey = (barter:LifeBarter):string => {
	if(Number.isFinite(barter.barterId)){
		return `barter:${barter.barterId}`;
	}
	const itemName = barter.gameItem?.itemName || "";
	const exchangeItemName = barter.exchangeItem?.itemName || "";
	const npcName = barter.gameNpc?.npcName || "";
	return `${itemName}|${exchangeItemName}|${npcName}`;
};

type BarterSearchSuggestion = {
	key:string;
	keyword:string;
	title:string;
	subtitle:string;
	meta:string;
};

const isMatchingRegisteredBarter = (barter:LifeBarter, currentBarter:UserTodoBarter):boolean => {
	const itemName = barter.gameItem?.itemName || "";
	const exchangeItemName = barter.exchangeItem?.itemName || "";
	const npcName = barter.gameNpc?.npcName || "";
	const candidateBaseKey = barterBaseKey(itemName, exchangeItemName);

	const currentItemName = currentBarter.itemName || "";
	const currentExchangeItemName = currentBarter.exchangeItemName || "";
	const currentNpcName = currentBarter.npcName || "";
	const currentBaseKey = barterBaseKey(currentItemName, currentExchangeItemName);
	if(currentBaseKey !== candidateBaseKey){
		return false;
	}
	if(isNpcShared(barter.barterNpc) || isNpcShared(currentBarter.barterNpc)){
		return true;
	}
	return currentNpcName === npcName;
};

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
	const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
	const listRef = useRef<HTMLDivElement>(null);
	const searchBoxRef = useRef<HTMLDivElement>(null);
	const favoriteItemNames = useMemo(() => {
		const deduped:string[] = [];
		const seen = new Set<string>();
		for(const item of favoriteItems || []){
			const rawName = item.itemName?.trim();
			const normalizedName = normalizeItemName(rawName);
			if(!normalizedName || seen.has(normalizedName)){
				continue;
			}
			seen.add(normalizedName);
			deduped.push(rawName);
		}
		return deduped;
	}, [favoriteItems]);
	
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
		return existingBarters.find((currentBarter) => isMatchingRegisteredBarter(barter, currentBarter));
	}, [existingBarters]);
	const normalizedKeyword = keyword.trim().toLowerCase();
	const hasKeyword = normalizedKeyword.length > 0;
	const availableSearchResults = useMemo(
		() => searchResults.filter((barter) => {
			if(isBarterRegistered(barter)){
				return false;
			}
			return true;
		}),
		[searchResults, isBarterRegistered]
	);
	const matchedRegisteredBarterIds = useMemo(() => {
		if(!hasKeyword){
			return new Set(existingBarters.map((barter) => barter.id));
		}
		const matchedIds = new Set<number>();
		for(const currentBarter of existingBarters){
			const matched = searchResults.some((barter) => isMatchingRegisteredBarter(barter, currentBarter));
			if(matched){
				matchedIds.add(currentBarter.id);
			}
		}
		return matchedIds;
	}, [hasKeyword, existingBarters, searchResults]);
	const favoriteItemNameSet = useMemo(
		() => new Set(favoriteItemNames.map((itemName) => normalizeItemName(itemName))),
		[favoriteItemNames]
	);
	const normalizedFavoriteItemNames = useMemo(
		() => Array.from(favoriteItemNameSet),
		[favoriteItemNameSet]
	);
	const isFavoriteObtainedName = useCallback((obtainedName:string | undefined) => {
		const normalizedObtainedName = normalizeItemName(obtainedName);
		if(!normalizedObtainedName){
			return false;
		}
		return normalizedFavoriteItemNames.some((favoriteName) => isNormalizedItemNameMatch(normalizedObtainedName, favoriteName));
	}, [normalizedFavoriteItemNames]);
	const favoritePinnedResults = useMemo(() => {
		const pinned:LifeBarter[] = [];
		const seen = new Set<string>();
		const sourceBarters = hasKeyword ? searchResults : [...recommendations, ...searchResults];
		const appendFavorite = (barter:LifeBarter) => {
			if(!isFavoriteObtainedName(barter.gameItem?.itemName)){
				return;
			}
			if(isBarterRegistered(barter)){
				return;
			}
			const key = getBarterIdentityKey(barter);
			if(seen.has(key)){
				return;
			}
			seen.add(key);
			pinned.push(barter);
		};
		sourceBarters.forEach(appendFavorite);
		return pinned;
	}, [hasKeyword, recommendations, searchResults, isFavoriteObtainedName, isBarterRegistered]);
	const registeredBarters = useMemo(() => {
		return existingBarters.filter((barter) => matchedRegisteredBarterIds.has(barter.id));
	}, [existingBarters, matchedRegisteredBarterIds]);
	const hasFavoriteRecommendations = favoriteItemNames.length > 0;
	const hasAnyVisibleItem = favoritePinnedResults.length > 0
		|| registeredBarters.length > 0
		|| availableSearchResults.length > 0;
	const shouldShowEmpty = !loading
		&& !hasAnyVisibleItem
		&& !hasFavoriteRecommendations
		&& !(hasFavoriteRecommendations && recommendationLoading);
	const searchSuggestions = useMemo<BarterSearchSuggestion[]>(() => {
		if(!searchInput.trim()){
			return [];
		}

		const deduped = new Map<string, BarterSearchSuggestion>();
		for(const barter of searchResults){
			const obtainedName = (barter.gameItem?.itemName || "").trim();
			if(!obtainedName){
				continue;
			}
			const exchangeName = (barter.exchangeItem?.itemName || "").trim();
			const regionName = (barter.gameRegion?.regionName || "").trim();
			const npcName = (barter.gameNpc?.npcName || "").trim();
			const dedupeKey = `${obtainedName}|${exchangeName}|${npcName}`;
			if(deduped.has(dedupeKey)){
				continue;
			}
			deduped.set(dedupeKey, {
				key : `${barter.barterId}-${barter.itemId}-${barter.exchangeId}`,
				keyword : obtainedName,
				title : `${obtainedName} ↔ ${exchangeName || "-"}`,
				subtitle : `${regionName || "-"} / ${npcName || "-"}`,
				meta : `교환 ${barter.exchangeCost ?? 0}개 · 최대 ${barter.barterQty ?? 0}회`
			});
			if(deduped.size >= 8){
				break;
			}
		}
		return Array.from(deduped.values());
	}, [searchInput, searchResults]);
	
	// 검색어 debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			setKeyword(searchInput);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

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
					const favoriteNameKey = normalizeItemName(itemName);
					for(const barter of result.content){
						const obtainedItemName = barter.gameItem?.itemName;
						if(!obtainedItemName || !isNormalizedItemNameMatch(normalizeItemName(obtainedItemName), favoriteNameKey)){
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
		setShowSearchSuggestions(false);
	};
	
	const handleReset = () => {
		setSearchInput("");
		setKeyword("");
		setShowSearchSuggestions(false);
	};
	
	const handleKeyPress = (e:React.KeyboardEvent) => {
		if(e.key === "Enter"){
			handleSearch();
		}
	};

	const applySearchSuggestion = (nextKeyword:string) => {
		const trimmed = nextKeyword.trim();
		if(!trimmed){
			return;
		}
		setSearchInput(trimmed);
		setKeyword(trimmed);
		setShowSearchSuggestions(false);
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
				barterInitCycle : added.barterInitCycle ?? cycle,
				completedCount : added.completedCount ?? 0
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

	const renderAddedBarterCard = (barter:UserTodoBarter, keyPrefix:string) => (
		<div key={`${keyPrefix}-${barter.id}`} className={styles.abyssPreviewCard}>
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
	);

	const renderRegisteredBarterCard = (barter:UserTodoBarter, keyPrefix:string) => {
		const maxTrades = toSafeBarterCount(barter.barterQty);
		const hasServerShare = Number(barter.barterServer) > 0;
		const hasNpcShare = Number(barter.barterNpc) > 0;
		return (
			<div
				key={`${keyPrefix}-${barter.id}`}
				className={`${styles.barterSettingsCard} ${styles.registered}`}
			>
				<div className={styles.barterCardHeader}>
					<div className={styles.barterCardLocation}>
						<MapPin size={14}/>
						<span className={styles.barterCardLocationText}>{barter.regionName || "N/A"}</span>
						<User size={14}/>
						<span className={styles.barterCardLocationText}>{barter.npcName || "N/A"}</span>
					</div>
					<button
						type="button"
						className={`${styles.barterToggleBtn} ${styles.remove}`}
						onClick={() => handleRemoveAddedBarter(barter.id)}
					>
						제거
					</button>
				</div>
				<div className={styles.barterCardExchange}>
					<div className={styles.barterCardItem}>
						<span className={styles.barterCardLabel}>교환</span>
						<span className={styles.barterCardValue}>{barter.exchangeItemName || "N/A"}</span>
						<span className={styles.barterCardQty}>x{barter.exchangeCost ?? 0}</span>
					</div>
					<ArrowRight size={20} className={styles.barterCardArrow}/>
					<div className={styles.barterCardItem}>
						<span className={styles.barterCardLabel}>획득</span>
						<span className={styles.barterCardValue}>{barter.itemName || "N/A"}</span>
						<span className={styles.barterCardSubInfo}>최대 {maxTrades}회</span>
					</div>
				</div>
				{(hasServerShare || hasNpcShare) && (
					<div className={styles.barterCardNote}>
						{hasServerShare && <span>서버 공유</span>}
						{hasServerShare && hasNpcShare && <span> / </span>}
						{hasNpcShare && <span>NPC 공유</span>}
					</div>
				)}
			</div>
		);
	};

	const renderBarterCard = (barter:LifeBarter, keyPrefix:string) => {
		const iName = barter.gameItem?.itemName || "";
		const eName = barter.exchangeItem?.itemName || "";
		const nName = barter.gameNpc?.npcName || "";
		const isAdded = isBarterRegistered(barter);
		const rewardPerTrade = toSafeBarterCount(barter.itemWeight);
		const maxTrades = toSafeBarterCount(barter.barterQty);
		const totalReward = rewardPerTrade * maxTrades;
		const hasServerShare = Number(barter.barterServer) > 0;
		const hasNpcShare = Number(barter.barterNpc) > 0;
		return (
			<div
				key={`${keyPrefix}-${barter.barterId}-${iName}-${eName}-${nName}`}
				className={`${styles.barterSettingsCard} ${isAdded ? styles.registered : ""}`}
			>
				<div className={styles.barterCardHeader}>
					<div className={styles.barterCardLocation}>
						<MapPin size={14}/>
						<span className={styles.barterCardLocationText}>{barter.gameRegion?.regionName || "N/A"}</span>
						<User size={14}/>
						<span className={styles.barterCardLocationText}>{barter.gameNpc?.npcName || "N/A"}</span>
					</div>
					<button
						type="button"
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
							<span className={styles.barterCardQty}>x{rewardPerTrade}</span>
							<span className={styles.barterCardSubInfo}>최대 {maxTrades}회 · 총 x{totalReward}</span>
						</div>
					</div>
					{(hasServerShare || hasNpcShare) && (
						<div className={styles.barterCardNote}>
							{hasServerShare && <span>서버 공유</span>}
							{hasServerShare && hasNpcShare && <span> / </span>}
							{hasNpcShare && <span>NPC 공유</span>}
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
					<div className={styles.barterSearchBox} ref={searchBoxRef}>
						<Search size={18} className={styles.barterSearchIcon}/>
						<input
							type="text"
							placeholder="획득 아이템 이름으로 검색..."
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
							autoFocus
						/>
						{showSearchSuggestions && searchInput.trim() && (
							<div className={styles.barterSearchSuggestionList}>
								{searchSuggestions.length > 0 ? (
									searchSuggestions.map((suggestion) => (
										<button
											key={suggestion.key}
											type="button"
											className={styles.barterSearchSuggestionItem}
											onClick={() => applySearchSuggestion(suggestion.keyword)}
										>
											<span className={styles.barterSearchSuggestionTitle}>{suggestion.title}</span>
											<span className={styles.barterSearchSuggestionSubtitle}>{suggestion.subtitle}</span>
											<span className={styles.barterSearchSuggestionMeta}>{suggestion.meta}</span>
										</button>
									))
								) : (
									<div className={styles.barterSearchSuggestionEmpty}>
										{loading ? "검색 중..." : "추천 검색 결과가 없습니다."}
									</div>
								)}
							</div>
						)}
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
					{hasFavoriteRecommendations && (
						<div className={styles.barterListSection}>
							<div className={styles.barterListSectionTitle}>
								{recommendationLoading ? "즐겨찾기 아이템 불러오는 중..." : `즐겨찾기 아이템 (${favoritePinnedResults.length})`}
							</div>
							{recommendationLoading ? (
								<div className={styles.barterLoadingMore}>
									<RefreshCw className={styles.spinning} size={18}/>
									<span>불러오는 중...</span>
								</div>
							) : favoritePinnedResults.length > 0 ? (
								favoritePinnedResults.map(barter => renderBarterCard(barter, "favorite"))
							) : (
								<div className={styles.emptyMessage}>즐겨찾기 물물교환 항목이 없습니다.</div>
							)}
						</div>
					)}
					{registeredBarters.length > 0 && (
						<div className={styles.barterListSection}>
							<div className={styles.barterListSectionTitle}>등록된 아이템 ({registeredBarters.length})</div>
							{registeredBarters.map(barter => renderRegisteredBarterCard(barter, "registered"))}
						</div>
					)}
					{availableSearchResults.length > 0 && (
						<div className={styles.barterListSection}>
							<div className={styles.barterListSectionTitle}>추가 가능 아이템 ({availableSearchResults.length})</div>
							{availableSearchResults.map(barter => renderBarterCard(barter, "available"))}
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
							{existingBarters.map(barter => renderAddedBarterCard(barter, "preview"))}
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

