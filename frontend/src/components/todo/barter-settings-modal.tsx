import React, {useState, useEffect, useRef, useCallback} from "react";
import styles from "./todo.module.scss";
import {LifeBarter, UserTodoBarter} from "../../types";
import {GameItemService} from "../../services/game-item-service";
import {todoService} from "../../services/todo-service";
import {ArrowRight, Search, RefreshCw} from "lucide-react";

interface BarterSettingsModalProps{
	characterId:number;
	cycle:number;
	cycleLabel:string;
	existingBarters:UserTodoBarter[];
	onUpdate:(barters:UserTodoBarter[]) => void;
	onClose:() => void;
}

const BarterSettingsModal:React.FC<BarterSettingsModalProps> = ({characterId, cycle, cycleLabel, existingBarters, onUpdate, onClose}) => {
	const [searchInput, setSearchInput] = useState("");
	const [keyword, setKeyword] = useState("");
	const [searchResults, setSearchResults] = useState<LifeBarter[]>([]);
	const [loading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [totalElements, setTotalElements] = useState(0);
	const listRef = useRef<HTMLDivElement>(null);

	const existingBarterIds = new Set(existingBarters.map(b => b.barterId));

	const loadData = useCallback(async(reset = false) => {
		if(loading || (!hasMore && !reset)) return;

		setLoading(true);
		try{
			const page = reset ? 0 : currentPage;
			const result = await GameItemService.getBarters({
				keyword: keyword.trim() || undefined,
				page,
				size: 20,
				searchMode: "obtained",
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
		try{
			const barterCycle = cycle === 1 ? "daily" : "weekly";
			const added = await todoService.addBarterItem(characterId, barter.barterId, barterCycle);
			// 백엔드 응답에 아이템명이 없을 경우 검색 결과에서 보충
			const enriched:UserTodoBarter = {
				...added,
				itemName: added.itemName || barter.gameItem?.itemName,
				exchangeItemName: added.exchangeItemName || barter.exchangeItem?.itemName,
				regionName: added.regionName || barter.gameRegion?.regionName,
				npcName: added.npcName || barter.gameNpc?.npcName,
				exchangeCost: added.exchangeCost ?? barter.exchangeCost,
				barterQty: added.barterQty ?? barter.barterQty,
				barterInitCycle: added.barterInitCycle ?? cycle
			};
			onUpdate([...existingBarters, enriched]);
		}catch(err){
			console.error("Failed to add barter:", err);
		}
	};

	const handleRemove = async(barterId:number) => {
		const existing = existingBarters.find(b => b.barterId === barterId);
		if(!existing) return;
		try{
			await todoService.removeBarterItem(characterId, existing.id);
			onUpdate(existingBarters.filter(b => b.barterId !== barterId));
		}catch(err){
			console.error("Failed to remove barter:", err);
		}
	};

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.barterSettingsModal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h3>{cycleLabel} 물물교환 설정</h3>
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
					{searchResults.map(barter => {
						const isAdded = existingBarterIds.has(barter.barterId);
						return (
							<div
								key={barter.barterId}
								className={`${styles.barterSettingsCard} ${isAdded ? styles.registered : ""}`}
							>
								<div className={styles.barterCardHeader}>
									<span className={styles.barterCardLocation}>
										{barter.gameRegion?.regionName || "N/A"} - {barter.gameNpc?.npcName || "N/A"}
									</span>
									<button
										className={`${styles.barterToggleBtn} ${isAdded ? styles.remove : styles.add}`}
										onClick={() => isAdded ? handleRemove(barter.barterId) : handleAdd(barter)}
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
								{barter.barterEtc && (
									<div className={styles.barterCardNote}>{barter.barterEtc}</div>
								)}
							</div>
						);
					})}

					{loading && (
						<div className={styles.barterLoadingMore}>
							<RefreshCw className={styles.spinning} size={18}/>
							<span>불러오는 중...</span>
						</div>
					)}

					{!loading && !hasMore && searchResults.length > 0 && (
						<div className={styles.barterEndMessage}>더 이상 데이터가 없습니다.</div>
					)}

					{!loading && searchResults.length === 0 && (
						<div className={styles.emptyMessage}>
							{keyword ? "검색 결과가 없습니다." : "물물교환 데이터가 없습니다."}
						</div>
					)}
				</div>
				<div className={styles.modalFooter}>
					<button className={styles.modalSaveBtn} onClick={onClose}>닫기</button>
				</div>
			</div>
		</div>
	);
};

export default BarterSettingsModal;
