import React, {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {GameItemData, LifeBarter, LifeCraft} from "@/types";
import GameItemService from "@/services/game-item-service";
import {getItemRarityInfo, normalizeMultilineText, parseItemTranscendence, resolveItemEffectTemplate, toItemDetailPath} from "@/utils";
import {X, ArrowRight, Hammer, ArrowLeftRight, Package, MapPin, User, RefreshCw, Pencil} from "lucide-react";
import styles from "./item-detail-modal.module.scss";
import type {ItemDetailModalProps} from "@/types/ui";

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

const ItemDetailModal:React.FC<ItemDetailModalProps> = ({item, onClose}) => {
	const navigate = useNavigate();
	const [itemData, setItemData] = useState<GameItemData | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<"barter" | "craft">("barter");

	useEffect(() => {
		/**
		 * Utility function async.
		 */
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

	/**
	 * Utility function handleBackdropClick.
	 */
	const handleBackdropClick = (e:React.MouseEvent) => {
		if(e.target === e.currentTarget){
			onClose();
		}
	};

	useEffect(() => {
		/**
		 * Utility function handleEsc.
		 */
		const handleEsc = (e:KeyboardEvent) => {
			if(e.key === "Escape"){
				onClose();
			}
		};

		window.addEventListener("keydown", handleEsc);
		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
		document.body.style.overflow = "hidden";
		document.body.style.paddingRight = `${scrollbarWidth}px`;

		return () => {
			window.removeEventListener("keydown", handleEsc);
			document.body.style.overflow = "";
			document.body.style.paddingRight = "";
		};
	}, [onClose]);

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

	const bartersByItemId = itemData?.bartersByItemId || [];
	const bartersByExchangeId = itemData?.bartersByExchangeId || [];
	const craftsBySubId = itemData?.craftsBySubId || {};
	const hasBarters = bartersByItemId.length > 0 || bartersByExchangeId.length > 0;
	const hasCrafts = Object.keys(craftsBySubId).length > 0;
	const displayItemType = item.itemType || itemData?.itemType || "-";
	const displayItemMainMenu = item.itemMainMenu || itemData?.itemMainMenu || "";
	const displayItemSubMenu = item.itemSubMenu || itemData?.itemSubMenu || "";
	const isSubMenuSameAsType = useMemo(() => {
		const normalizedSubMenu = normalizeMultilineText(displayItemSubMenu).trim();
		const normalizedType = normalizeMultilineText(displayItemType).trim();
		return Boolean(normalizedSubMenu) && normalizedSubMenu === normalizedType;
	}, [displayItemSubMenu, displayItemType]);
	const displayItemRarity = item.itemRarity || itemData?.itemRarity || "";
	const displayItemEffect = useMemo(
		() => resolveItemEffectTemplate(
			item.itemEffect || itemData?.itemEffect || "",
			item.itemTranscendence ?? itemData?.itemTranscendence
		),
		[item.itemEffect, itemData?.itemEffect, item.itemTranscendence, itemData?.itemTranscendence]
	);
	const displayItemSource = normalizeMultilineText(item.itemSource || itemData?.itemSource || "");
	const parsedTranscendence = useMemo(
		() => parseItemTranscendence(item.itemTranscendence ?? itemData?.itemTranscendence),
		[item.itemTranscendence, itemData?.itemTranscendence]
	);
	const rarityInfo = getItemRarityInfo(displayItemRarity);
	const hasItemMetaDetails = !!displayItemSource;
	const rarityStyle = {
		"--rarity-color" : rarityInfo.color,
		"--rarity-bg" : rarityInfo.bg
	} as React.CSSProperties;
	/**
	 * Utility function handleOpenReportPage.
	 */
	const handleOpenReportPage = () => {
		navigate(toItemDetailPath(item.itemName), {
			state : {openReportModal : true}
		});
	};

	return (
		<div className={styles.modalBackdrop} onClick={handleBackdropClick}>
			<div className={styles.modalContent}>
				<div className={styles.modalHeader}>
					<div className={styles.itemInfo}>
						<Package size={24}/>
						<div>
							<div className={styles.titleRow}>
								<h2>{item.itemName}</h2>
								<button type="button" className={styles.reportBtn} onClick={handleOpenReportPage}>
									<Pencil size={13}/>
									<span>{"아이템 제보"}</span>
								</button>
							</div>
							<div className={styles.itemMeta}>
								<span className={styles.itemRarity} style={rarityStyle}>
									{rarityInfo.label}
								</span>
								<span
									className={`${styles.itemMetaChip} ${styles.itemMetaChipMain}`}
									title={`상위 메뉴: ${displayItemMainMenu || "-"}`}
								>
									{displayItemMainMenu || "-"}
								</span>
								{!isSubMenuSameAsType && (
								<span
									className={`${styles.itemMetaChip} ${styles.itemMetaChipSub}`}
									title={`하위 메뉴: ${displayItemSubMenu || "-"}`}
								>
									{displayItemSubMenu || "-"}
								</span>
								)}
								<span
									className={`${styles.itemMetaChip} ${styles.itemMetaChipType}`}
									title={`유형: ${displayItemType}`}
								>
									{displayItemType}
								</span>
							</div>
						</div>
					</div>
					<button className={styles.closeBtn} onClick={onClose}>
						<X size={24}/>
					</button>
				</div>

				{hasItemMetaDetails && (
					<div className={styles.itemExtraMeta}>
						<div className={styles.metaGrid}>
							{displayItemSource && (
								<div className={`${styles.metaRow} ${styles.metaRowBlock}`}>
									<span className={styles.metaLabel}>{"아이템 출처"}</span>
									<span className={`${styles.metaValue} ${styles.metaValueBlock}`}>{displayItemSource}</span>
								</div>
							)}
						</div>
					</div>
				)}

				{displayItemEffect.text && (
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
				)}

				{(parsedTranscendence.rows.length > 0 || parsedTranscendence.parseError) && (
					<div className={styles.transcendenceSection}>
						<div className={styles.transcendenceTitle}>초월 수치</div>
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

				{loading && (
					<div className={styles.loading}>
						<RefreshCw className={styles.spinning} size={24}/>
						<span>정보를 불러오는 중...</span>
					</div>
				)}

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
