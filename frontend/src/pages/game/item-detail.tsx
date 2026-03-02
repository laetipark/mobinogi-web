import React, {useEffect, useMemo, useRef, useState} from "react";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import {GameItemData, GameItemSummary, LifeBarter, LifeCraft} from "@/types";
import GameItemService from "@/services/game-item-service";
import {fromItemSlug, getItemRarityInfo, normalizeMultilineText, parseItemTranscendence, resolveItemEffectTemplate} from "@/utils";
import ItemEditReportPanel from "@/components/game/item-edit-report-panel";
import {useAuth} from "@/hooks";
import {ArrowLeft, ArrowRight, Hammer, ArrowLeftRight, Package, MapPin, User, RefreshCw, Pencil, X} from "lucide-react";
import styles from "./item-detail.module.scss";

type ItemDetailRouteState = {
	openReportModal?:boolean;
};

/**
 * Utility function normalizeComparableText.
 */
const normalizeComparableText = (value:string | null | undefined):string => {
	return normalizeMultilineText(value).trim();
};

/**
 * Utility function formatCraftLevel.
 */
const formatCraftLevel = (craftableLevel:number | null | undefined):string => {
	if(craftableLevel === null || craftableLevel === undefined){
		return "-";
	}
	return `${craftableLevel}`;
};

/**
 * Utility function formatProcessingTime.
 */
const formatProcessingTime = (processingTime:number | null | undefined):string => {
	if(processingTime === null || processingTime === undefined){
		return "-";
	}
	const minutes = Math.floor(processingTime / 60);
	const seconds = processingTime % 60;
	if(minutes <= 0){
		return `${seconds}초`;
	}
	if(seconds === 0){
		return `${minutes}분`;
	}
	return `${minutes}분 ${seconds}초`;
};

/**
 * Utility function toSafeBarterCount.
 */
const toSafeBarterCount = (value:unknown):number => {
	const parsed = Number(value);
	if(!Number.isFinite(parsed) || parsed < 0){
		return 0;
	}
	return Math.trunc(parsed);
};

/**
 * Utility function getBarterRewardDisplay.
 */
const getBarterRewardDisplay = (barter:LifeBarter) => {
	const rewardPerTrade = toSafeBarterCount(barter.itemWeight);
	const maxTrades = toSafeBarterCount(barter.barterQty);
	return {
		rewardPerTrade,
		maxTrades,
		totalReward : rewardPerTrade * maxTrades
	};
};

const ItemDetailPage:React.FC = () => {
	const {itemName} = useParams<{itemName:string}>();
	const location = useLocation();
	const navigate = useNavigate();
	const {user} = useAuth();
	const routeState = location.state as ItemDetailRouteState | null;
	const [itemData, setItemData] = useState<GameItemData | null>(null);
	const [itemSummary, setItemSummary] = useState<GameItemSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [activeTab, setActiveTab] = useState<"barter" | "craft">("barter");
	const [showReportModal, setShowReportModal] = useState(false);
	const autoOpenedReportItemRef = useRef<string | null>(null);

	useEffect(() => {
		if(!itemName){
			return;
		}

		const decodedName = fromItemSlug(itemName);
		/**
		 * Utility function async.
		 */
		const fetchData = async() => {
			setLoading(true);
			setError(false);
			try{
				const [detailData, summaryPage] = await Promise.all([
					GameItemService.getItemByName(decodedName),
					GameItemService.getGameItems({keyword: decodedName, size: 1})
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

	useEffect(() => {
		if(!itemName){
			return;
		}
		if(!routeState?.openReportModal){
			return;
		}
		if(autoOpenedReportItemRef.current === itemName){
			return;
		}
		autoOpenedReportItemRef.current = itemName;
		setShowReportModal(true);
	}, [itemName, routeState?.openReportModal]);

	/**
	 * Utility function renderBarterCard.
	 */
	const renderBarterCard = (barter:LifeBarter) => {
		const reward = getBarterRewardDisplay(barter);
		const hasServerShare = Number(barter.barterServer) > 0;
		const hasNpcShare = Number(barter.barterNpc) > 0;
		return (
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
						<span className={styles.itemCount}>x{reward.rewardPerTrade}</span>
						<span className={styles.itemMetaHint}>최대 {reward.maxTrades}회 · 총 x{reward.totalReward}</span>
					</div>
				</div>
				{(hasServerShare || hasNpcShare) && (
					<div className={styles.barterNote}>
						{hasServerShare && <span>서버 공유</span>}
						{hasServerShare && hasNpcShare && <span> / </span>}
						{hasNpcShare && <span>NPC 공유</span>}
					</div>
				)}
			</div>
		);
	};

	/**
	 * Utility function renderCraftGroup.
	 */
	const renderCraftGroup = (subId:number, crafts:LifeCraft[]) => (
		<div key={subId} className={styles.craftGroup}>
			<div className={styles.craftResult}>
				<Hammer size={16}/>
				<span className={styles.resultName}>{crafts[0]?.itemName || crafts[0]?.gameItem?.itemName || "N/A"}</span>
			</div>
			<div className={styles.craftMeta}>
				<span>{crafts[0]?.craftType || "-"}</span>
				<span>{crafts[0]?.craftName || "-"}</span>
				<span>레벨 {formatCraftLevel(crafts[0]?.craftableLevel)}</span>
				<span>소요 {formatProcessingTime(crafts[0]?.processingTime)}</span>
				<span>서브 #{subId}</span>
			</div>
			<div className={styles.craftIngredients}>
				{crafts.map((craft, idx) => (
					<div key={idx} className={styles.ingredient}>
						<span className={styles.ingredientName}>{craft.ingredientName || craft.ingredientItem?.itemName || "N/A"}</span>
						<span className={styles.ingredientCount}>x{craft.craftIngredientCost}</span>
					</div>
				))}
			</div>
		</div>
	);

	const displayName = itemData?.itemName || (itemName ? fromItemSlug(itemName) : "");
	const bartersByItemId = itemData?.bartersByItemId || [];
	const bartersByExchangeId = itemData?.bartersByExchangeId || [];
	const craftsBySubId = itemData?.craftsBySubId || {};
	const hasBarters = bartersByItemId.length > 0 || bartersByExchangeId.length > 0;
	const hasCrafts = Object.keys(craftsBySubId).length > 0;
	const displayItemMainMenu = itemSummary?.itemMainMenu || itemData?.itemMainMenu || "";
	const displayItemType = itemSummary?.itemType || itemData?.itemType || "-";
	const displayItemSubMenu = itemSummary?.itemSubMenu || itemData?.itemSubMenu || "";
	const isSubMenuSameAsType = useMemo(() => {
		const normalizedSubMenu = normalizeComparableText(displayItemSubMenu);
		const normalizedType = normalizeComparableText(displayItemType);
		return Boolean(normalizedSubMenu) && normalizedSubMenu === normalizedType;
	}, [displayItemSubMenu, displayItemType]);
	const displayItemRarity = itemSummary?.itemRarity || itemData?.itemRarity || "";
	const displayItemSource = normalizeMultilineText(itemSummary?.itemSource || itemData?.itemSource || "");
	const displayItemEffect = useMemo(
		() => resolveItemEffectTemplate(
			itemSummary?.itemEffect || itemData?.itemEffect || "",
			itemSummary?.itemTranscendence ?? itemData?.itemTranscendence
		),
		[itemSummary?.itemEffect, itemData?.itemEffect, itemSummary?.itemTranscendence, itemData?.itemTranscendence]
	);
	const parsedTranscendence = useMemo(
		() => parseItemTranscendence(itemSummary?.itemTranscendence ?? itemData?.itemTranscendence),
		[itemSummary?.itemTranscendence, itemData?.itemTranscendence]
	);
	const rarityInfo = getItemRarityInfo(displayItemRarity);
	const barterAcquireCount = bartersByItemId.length;
	const barterMaterialCount = bartersByExchangeId.length;
	const craftRecipeCount = Object.keys(craftsBySubId).length;
	/**
	 * Utility function handleOpenReportModal.
	 */
	const handleOpenReportModal = () => setShowReportModal(true);
	/**
	 * Utility function handleCloseReportModal.
	 */
	const handleCloseReportModal = () => setShowReportModal(false);

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
							<div className={styles.header}>
							<div className={styles.itemInfo}>
								<Package size={24}/>
								<div>
									<div className={styles.itemTitleRow}>
										<h2>{displayName}</h2>
										<button
											type="button"
											className={styles.reportBtn}
											onClick={handleOpenReportModal}
										>
											<Pencil size={14}/>
											<span>{"아이템 제보"}</span>
										</button>
									</div>
										<div className={styles.itemMeta}>
											<span
												className={styles.itemRarity}
												style={{
													"--item-rarity-accent" : rarityInfo.color,
													"--item-rarity-bg" : rarityInfo.bg
												} as React.CSSProperties}
											>
												{rarityInfo.label}
											</span>
											{displayItemMainMenu && (
												<span className={`${styles.itemMetaChip} ${styles.itemMetaChipMain}`}>
													{displayItemMainMenu}
												</span>
											)}
											{displayItemSubMenu && !isSubMenuSameAsType && (
												<span className={`${styles.itemMetaChip} ${styles.itemMetaChipSub}`}>
													{displayItemSubMenu}
												</span>
											)}
											<span className={styles.itemType}>{displayItemType}</span>
										</div>
								</div>
							</div>
							</div>

							<div className={styles.overviewSection}>
								<section className={styles.overviewCard}>
									<div className={styles.overviewCardHeader}>
										<h3>기본 정보</h3>
										<p>분류와 타입 기준으로 아이템을 빠르게 파악할 수 있습니다.</p>
									</div>
									<div className={styles.infoRows}>
										<div className={styles.infoRow}>
											<span className={styles.infoLabel}>상위 메뉴</span>
											<div className={styles.infoValueChips}>
												<span className={`${styles.infoChip} ${displayItemMainMenu ? styles.infoChipMain : styles.infoChipMuted}`}>{displayItemMainMenu || "-"}</span>
											</div>
										</div>
										{!isSubMenuSameAsType && (
										<div className={styles.infoRow}>
											<span className={styles.infoLabel}>하위 메뉴</span>
											<div className={styles.infoValueChips}>
												<span className={`${styles.infoChip} ${displayItemSubMenu ? styles.infoChipSub : styles.infoChipMuted}`}>{displayItemSubMenu || "-"}</span>
											</div>
										</div>
										)}
										<div className={styles.infoRow}>
											<span className={styles.infoLabel}>유형</span>
											<div className={styles.infoValueChips}>
												<span className={`${styles.infoChip} ${displayItemType && displayItemType !== "-" ? styles.infoChipType : styles.infoChipMuted}`}>{displayItemType || "-"}</span>
											</div>
										</div>
										<div className={styles.infoRow}>
											<span className={styles.infoLabel}>등급</span>
											<div className={styles.infoValueChips}>
												<span
													className={`${styles.infoChip} ${styles.infoChipRarity}`}
													style={
														{
															"--info-rarity-color" : rarityInfo.color,
															"--info-rarity-bg" : rarityInfo.bg
														} as React.CSSProperties
													}
												>
													{rarityInfo.label}
												</span>
											</div>
										</div>
									</div>
								</section>

								<section className={styles.overviewCard}>
									<div className={styles.overviewCardHeader}>
										<h3>획득/사용처</h3>
										<p>물물교환과 제작 기준으로 이 아이템의 획득 경로와 사용처를 요약합니다.</p>
									</div>
									<div className={styles.statGrid}>
										<div className={styles.statCard}>
											<span className={styles.statLabel}>물물교환 획득</span>
											<strong className={styles.statValue}>{barterAcquireCount}</strong>
											<span className={styles.statUnit}>건</span>
										</div>
										<div className={styles.statCard}>
											<span className={styles.statLabel}>물물교환 사용처</span>
											<strong className={styles.statValue}>{barterMaterialCount}</strong>
											<span className={styles.statUnit}>건</span>
										</div>
										<div className={styles.statCard}>
											<span className={styles.statLabel}>제작 획득</span>
											<strong className={styles.statValue}>{craftRecipeCount}</strong>
											<span className={styles.statUnit}>종</span>
										</div>
									</div>
								</section>
							</div>

							{displayItemSource && (
								<section className={styles.infoBlock}>
									<div className={styles.infoBlockHeader}>
										<h3>획득처</h3>
										<span>아이템 소스 메모</span>
									</div>
									<div className={styles.sourceText}>{displayItemSource}</div>
								</section>
							)}

							{displayItemEffect.text && (
								<section className={styles.infoBlock}>
									<div className={styles.infoBlockHeader}>
										<h3>아이템 효과</h3>
										<span>게임 내 설명 기준</span>
									</div>
									<div className={styles.itemEffect}>
										{displayItemEffect.lines.map((line, lineIndex) => (
											<React.Fragment key={`effect-line-${lineIndex}`}>
												{line.map((segment, segmentIndex) => (
													segment.highlighted ? (
														<span key={`effect-segment-${lineIndex}-${segmentIndex}`} className={styles.itemEffectValue}>
															{segment.text}
														</span>
													) : (
														<React.Fragment key={`effect-segment-${lineIndex}-${segmentIndex}`}>
															{segment.text}
														</React.Fragment>
													)
												))}
												{lineIndex < displayItemEffect.lines.length - 1 && <br/>}
											</React.Fragment>
										))}
									</div>
								</section>
							)}

							{(parsedTranscendence.rows.length > 0 || parsedTranscendence.parseError) && (
								<div className={`${styles.transcendenceSection} ${styles.infoBlock}`}>
									<div className={styles.infoBlockHeader}>
										<h3>초월 수치</h3>
										<span>파싱된 수치 데이터</span>
									</div>
									{parsedTranscendence.rows.length > 0 ? (
									<div className={styles.transcendenceList}>
										{parsedTranscendence.rows.map((row) => (
											<div key={row.key} className={styles.transcendenceRow}>
												<span className={styles.transcendenceLabel}>{row.label}</span>
												{row.tierValues ? (
													<div className={styles.transcendenceTierValues}>
														{row.tierValues.map((tier) => (
															<span key={`${row.key}-${tier.tier}`} className={styles.transcendenceChip}>
																<span className={styles.transcendenceChipTier}>{tier.tier}</span>
																<span>{tier.value}</span>
															</span>
														))}
													</div>
												) : (
													<span className={styles.transcendenceValue}>{row.value}</span>
												)}
											</div>
										))}
									</div>
								) : (
									<pre className={styles.transcendenceRaw}>{parsedTranscendence.rawText}</pre>
								)}
								</div>
							)}

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

						{!hasBarters && !hasCrafts && (
							<div className={styles.noData}>
								이 아이템에 대한 물물교환 및 제작 정보가 없습니다.
							</div>
						)}
					</div>
				)}
				{showReportModal && !loading && !error && itemData && (
					<div className={styles.reportOverlay} onClick={handleCloseReportModal}>
						<div className={styles.reportDialog} onClick={(e) => e.stopPropagation()}>
							<div className={styles.reportDialogHeader}>
								<div className={styles.reportDialogTitle}>
									<Pencil size={16}/>
									<span>{"아이템 제보"}</span>
								</div>
								<button type="button" className={styles.reportDialogCloseBtn} onClick={handleCloseReportModal}>
									<X size={18}/>
								</button>
							</div>
							<div className={styles.reportDialogBody}>
								<ItemEditReportPanel
									itemName={displayName}
									itemData={itemData}
									itemSummary={itemSummary}
								/>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default ItemDetailPage;
