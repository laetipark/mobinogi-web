import React, {useState, useEffect} from "react";
import {useParams, useNavigate} from "react-router-dom";
import {GameItemData, GameItemSummary, LifeBarter, LifeCraft} from "@/types";
import GameItemService from "@/services/game-item-service";
import {getItemRarityInfo} from "@/utils";
import {ArrowLeft, ArrowRight, Hammer, ArrowLeftRight, Package, MapPin, User, RefreshCw} from "lucide-react";
import styles from "./item-detail.module.scss";

const ItemDetailPage:React.FC = () => {
	const {itemName} = useParams<{itemName:string}>();
	const navigate = useNavigate();
	const [itemData, setItemData] = useState<GameItemData | null>(null);
	const [itemSummary, setItemSummary] = useState<GameItemSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [activeTab, setActiveTab] = useState<"barter" | "craft">("barter");

	useEffect(() => {
		if(!itemName) return;

		const decodedName = decodeURIComponent(itemName);

		const fetchData = async() => {
			setLoading(true);
			setError(false);
			try{
				const [detailData, summaryPage] = await Promise.all([
					GameItemService.getItemByName(decodedName),
					GameItemService.getGameItems({keyword:decodedName, size:1})
				]);
				setItemData(detailData);
				const match = summaryPage.content?.find(i => i.itemName === decodedName);
				setItemSummary(match || null);
			}catch(err){
				console.error("아이템 상세 정보 로드 실패:", err);
				setError(true);
			}finally{
				setLoading(false);
			}
		};

		fetchData();
	}, [itemName]);

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

	const displayName = itemData?.itemName || (itemName ? decodeURIComponent(itemName) : "");
	const bartersByItemId = itemData?.bartersByItemId || [];
	const bartersByExchangeId = itemData?.bartersByExchangeId || [];
	const craftsBySubId = itemData?.craftsBySubId || {};
	const hasBarters = bartersByItemId.length > 0 || bartersByExchangeId.length > 0;
	const hasCrafts = Object.keys(craftsBySubId).length > 0;
	const rarityInfo = getItemRarityInfo(itemSummary?.itemRarity);

	return (
		<div className={styles.itemDetailPage}>
			<div className={styles.container}>
			<button className={styles.backBtn} onClick={() => navigate(-1)}>
				<ArrowLeft size={18}/>
				<span>뒤로가기</span>
			</button>

			{loading && (
				<div className={styles.loading}>
					<RefreshCw className={styles.spinning} size={24}/>
					<span>정보를 불러오는 중...</span>
				</div>
			)}

			{error && (
				<div className={styles.error}>
					아이템을 찾을 수 없습니다.
				</div>
			)}

			{!loading && !error && itemData && (
				<div className={styles.content}>
					{/* 헤더 */}
					<div className={styles.header}>
						<div className={styles.itemInfo}>
							<Package size={24}/>
							<div>
								<h2>{displayName}</h2>
								{itemSummary && (
									<div className={styles.itemMeta}>
										<span className={styles.itemType}>{itemSummary.itemType}</span>
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
								)}
							</div>
						</div>
					</div>

					{/* 아이템 설명 */}
					{itemSummary?.itemEffect && (
						<div className={styles.itemEffect}>
							{itemSummary.itemEffect}
						</div>
					)}

					{/* 탭 네비게이션 */}
					{(hasBarters || hasCrafts) && (
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
					{!hasBarters && !hasCrafts && (
						<div className={styles.noData}>
							이 아이템에 대한 물물교환 및 제작 정보가 없습니다.
						</div>
					)}
				</div>
			)}
			</div>
		</div>
	);
};

export default ItemDetailPage;
