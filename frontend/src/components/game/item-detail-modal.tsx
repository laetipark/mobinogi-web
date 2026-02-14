import React, {useState, useEffect} from "react";
import {GameItem, GameItemSummary, GameItemData, LifeBarter, LifeCraft} from "@/types";
import GameItemService from "@/services/game-item-service";
import {getItemRarityInfo} from "@/utils";
import {X, ArrowRight, Hammer, ArrowLeftRight, Package, MapPin, User, RefreshCw} from "lucide-react";
import styles from "./item-detail-modal.module.scss";

interface ItemDetailModalProps{
	item:GameItem | GameItemSummary;
	onClose:() => void;
}

const ItemDetailModal:React.FC<ItemDetailModalProps> = ({item, onClose}) => {
	const [itemData, setItemData] = useState<GameItemData | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"barter" | "craft">("barter");
	
	useEffect(() => {
		const fetchItemData = async() => {
			setLoading(true);
			try{
				const data = await GameItemService.getItemByName(item.itemName);
				setItemData(data);
			}catch(error){
				console.error("아이템 상세 정보 로드 실패:", error);
			}finally{
				setLoading(false);
			}
		};
		
		fetchItemData();
	}, [item.itemName]);
	
	// 배경 클릭시 닫기
	const handleBackdropClick = (e:React.MouseEvent) => {
		if(e.target === e.currentTarget){
			onClose();
		}
	};
	
	// ESC 키로 닫기 및 body 스크롤 방지 (레이아웃 시프트 방지)
	useEffect(() => {
		const handleEsc = (e:KeyboardEvent) => {
			if(e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleEsc);
		
		// 스크롤바 너비 계산 및 body 패딩 추가로 레이아웃 시프트 방지
		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
		document.body.style.overflow = "hidden";
		document.body.style.paddingRight = `${scrollbarWidth}px`;
		
		return () => {
			window.removeEventListener("keydown", handleEsc);
			document.body.style.overflow = "";
			document.body.style.paddingRight = "";
		};
	}, [onClose]);
	
	// 물물교환 카드 렌더링
	const renderBarterCard = (barter:LifeBarter) => (
		<div key={barter.barterId} className={styles.barterCard}>
			<div className={styles.barterLocation}>
				<MapPin size={14}/>
				<span>{barter.gameRegion?.regionName || "N/A"}</span>
				<User size={14}/>
				<span>{barter.gameNpc?.npcName || "N/A"}</span>
			</div>
			<div className={styles.barterExchange}>
				<div className={styles.exchangeItem}>
					<span className={styles.itemName}>{barter.exchangeItem?.itemName || "N/A"}</span>
					<span className={styles.itemCount}>x{barter.exchangeCost}</span>
				</div>
				<ArrowRight size={20} className={styles.arrow}/>
				<div className={styles.exchangeItem}>
					<span className={styles.itemName}>{barter.gameItem?.itemName || "N/A"}</span>
					<span className={styles.itemCount}>x{barter.barterQty}</span>
				</div>
			</div>
			{(barter.barterServer || barter.barterNpc) && (
				<div className={styles.barterNote}>
					{barter.barterServer && <span>서버 공유</span>}
					{barter.barterServer && barter.barterNpc && <span> / </span>}
					{barter.barterNpc && <span>NPC 공유</span>}
				</div>
			)}
		</div>
	);
	
	// 제작 그룹 렌더링
	const renderCraftGroup = (subId:number, crafts:LifeCraft[]) => (
		<div key={subId} className={styles.craftGroup}>
			<div className={styles.craftResult}>
				<Hammer size={16}/>
				<span className={styles.resultName}>{crafts[0]?.gameItem?.itemName || "N/A"}</span>
			</div>
			<div className={styles.craftIngredients}>
				{crafts.map((craft, idx) => (
					<div key={idx} className={styles.ingredient}>
						<span className={styles.ingredientName}>{craft.ingredientItem?.itemName || "N/A"}</span>
						<span className={styles.ingredientCount}>x{craft.craftIngredientCost}</span>
					</div>
				))}
			</div>
		</div>
	);
	
	const bartersByItemId = itemData?.bartersByItemId || [];
	const bartersByExchangeId = itemData?.bartersByExchangeId || [];
	const craftsBySubId = itemData?.craftsBySubId || {};
	const hasBarters = bartersByItemId.length > 0 || bartersByExchangeId.length > 0;
	const hasCrafts = Object.keys(craftsBySubId).length > 0;
	const rarityInfo = getItemRarityInfo(item.itemRarity);
	
	return (
		<div className={styles.modalBackdrop} onClick={handleBackdropClick}>
			<div className={styles.modalContent}>
				{/* 헤더 */}
				<div className={styles.modalHeader}>
					<div className={styles.itemInfo}>
						<Package size={24}/>
						<div>
							<h2>{item.itemName}</h2>
							<div className={styles.itemMeta}>
								<span className={styles.itemType}>{item.itemType}</span>
								<span
									className={styles.itemRarity}
									style={{
										color : rarityInfo.color,
										backgroundColor : rarityInfo.bg,
										borderColor : rarityInfo.color
									}}
								>
									{rarityInfo.label}
								</span>
							</div>
						</div>
					</div>
					<button className={styles.closeBtn} onClick={onClose}>
						<X size={24}/>
					</button>
				</div>
				
				{/* 아이템 설명 */}
				{item.itemEffect && (
					<div className={styles.itemEffect}>
						{item.itemEffect}
					</div>
				)}
				
				{/* 로딩 */}
				{loading && (
					<div className={styles.loading}>
						<RefreshCw className={styles.spinning} size={24}/>
						<span>정보를 불러오는 중...</span>
					</div>
				)}
				
				{/* 탭 네비게이션 */}
				{!loading && (hasBarters || hasCrafts) && (
					<>
						<div className={styles.tabs}>
							<button
								className={`${styles.tab} ${activeTab === "barter" ? styles.active : ""}`}
								onClick={() => setActiveTab("barter")}
							>
								<ArrowLeftRight size={16}/>
								<span>물물교환</span>
								<span className={styles.count}>
									{bartersByItemId.length + bartersByExchangeId.length}
								</span>
							</button>
							<button
								className={`${styles.tab} ${activeTab === "craft" ? styles.active : ""}`}
								onClick={() => setActiveTab("craft")}
							>
								<Hammer size={16}/>
								<span>제작</span>
								<span className={styles.count}>
									{Object.keys(craftsBySubId).length}
								</span>
							</button>
						</div>
						
						{/* 물물교환 탭 */}
						{activeTab === "barter" && (
							<div className={styles.tabContent}>
								{bartersByItemId.length > 0 && (
									<div className={styles.section}>
										<h3 className={styles.sectionTitle}>
											<span className={styles.highlight}>획득</span> 가능한 물물교환
										</h3>
										<div className={styles.barterList}>
											{bartersByItemId.map(barter => renderBarterCard(barter))}
										</div>
									</div>
								)}
								
								{bartersByExchangeId.length > 0 && (
									<div className={styles.section}>
										<h3 className={styles.sectionTitle}>
											<span className={styles.highlight}>재료</span>로 사용되는 물물교환
										</h3>
										<div className={styles.barterList}>
											{bartersByExchangeId.map(barter => renderBarterCard(barter))}
										</div>
									</div>
								)}
								
								{!hasBarters && (
									<div className={styles.empty}>물물교환 정보가 없습니다.</div>
								)}
							</div>
						)}
						
						{/* 제작 탭 */}
						{activeTab === "craft" && (
							<div className={styles.tabContent}>
								{hasCrafts ? (
									<div className={styles.craftList}>
										{Object.entries(craftsBySubId).map(([subId, crafts]) =>
											renderCraftGroup(Number(subId), crafts)
										)}
									</div>
								) : (
									<div className={styles.empty}>제작 정보가 없습니다.</div>
								)}
							</div>
						)}
					</>
				)}
				
				{/* 데이터 없음 */}
				{!loading && !hasBarters && !hasCrafts && (
					<div className={styles.noData}>
						이 아이템에 대한 물물교환 및 제작 정보가 없습니다.
					</div>
				)}
			</div>
		</div>
	);
};

export default ItemDetailModal;
