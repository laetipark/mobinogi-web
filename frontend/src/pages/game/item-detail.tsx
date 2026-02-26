import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import {GameItemData, GameItemSummary, ItemEditSuggestion, LifeBarter, LifeCraft} from "@/types";
import GameItemService from "@/services/game-item-service";
import itemEditReportService from "@/services/item-edit-report-service";
import {fromItemSlug, getItemRarityInfo, normalizeMultilineText, parseItemTranscendence} from "@/utils";
import ItemEditReportPanel from "@/components/game/item-edit-report-panel";
import {useAuth} from "@/hooks";
import {ArrowLeft, ArrowRight, Hammer, ArrowLeftRight, Package, MapPin, User, RefreshCw, Pencil, X, ShieldCheck, Check} from "lucide-react";
import styles from "./item-detail.module.scss";

type ItemDetailRouteState = {
	openReportModal?:boolean;
};

const ITEM_EDIT_FIELD_LABEL_MAP:Record<string, string> = {
	itemMainMenu : "상위 메뉴",
	itemSubMenu : "하위 메뉴",
	itemType : "유형",
	itemRarity : "등급",
	itemName : "아이템 이름",
	itemEffect : "아이템 효과",
	itemTranscendence : "초월",
	itemSource : "획득처",
	regionId : "지역 ID",
	npcId : "NPC ID",
	itemId : "아이템 ID",
	itemWeight : "1회 획득 수량",
	exchangeId : "교환 아이템 ID",
	exchangeCost : "교환 비용",
	barterQty : "교환 가능 횟수",
	barterInitCycle : "초기 사이클",
	barterInitDate : "초기 날짜",
	barterInitDay : "초기 요일",
	barterServer : "서버 공유",
	barterNpc : "NPC 공유",
	craftType : "제작 유형",
	craftName : "제작명",
	craftIngredientId : "재료 ID",
	ingredientName : "재료 이름",
	craftIngredientCost : "재료 수량",
	craftableLevel : "제작 가능 레벨",
	processingTime : "가공 시간",
	craftSubId : "제작 서브 ID"
};

const normalizeComparableText = (value:string | null | undefined):string => {
	return normalizeMultilineText(value).trim();
};

const getItemEditFieldLabel = (
	fieldKey:string,
	itemSubMenu?:string | null,
	itemType?:string | null
):string => {
	if(fieldKey === "itemSubMenu"){
		const normalizedSubMenu = normalizeComparableText(itemSubMenu);
		const normalizedItemType = normalizeComparableText(itemType);
		if(normalizedSubMenu && normalizedSubMenu === normalizedItemType){
			return "유형";
		}
	}
	return ITEM_EDIT_FIELD_LABEL_MAP[fieldKey] ?? fieldKey;
};

const formatCraftLevel = (craftableLevel:number | null | undefined):string => {
	if(craftableLevel === null || craftableLevel === undefined){
		return "-";
	}
	return `${craftableLevel}`;
};

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

const toSafeBarterCount = (value:unknown):number => {
	const parsed = Number(value);
	if(!Number.isFinite(parsed) || parsed < 0){
		return 0;
	}
	return Math.trunc(parsed);
};

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
	const [showAdminReviewFloating, setShowAdminReviewFloating] = useState(true);
	const [pendingReports, setPendingReports] = useState<ItemEditSuggestion[]>([]);
	const [pendingReportsLoading, setPendingReportsLoading] = useState(false);
	const [pendingReportsError, setPendingReportsError] = useState<string | null>(null);
	const [pendingReportActionId, setPendingReportActionId] = useState<number | null>(null);
	const [pendingReportSuggestedEdits, setPendingReportSuggestedEdits] = useState<Record<number, string>>({});
	const autoOpenedReportItemRef = useRef<string | null>(null);
	const autoOpenedFloatingForItemRef = useRef<string | null>(null);

	useEffect(() => {
		if(!itemName){
			return;
		}

		const decodedName = fromItemSlug(itemName);
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

	const reviewTargetItemName = useMemo(
		() => itemData?.itemName || (itemName ? fromItemSlug(itemName) : ""),
		[itemData?.itemName, itemName]
	);

	const loadPendingReports = useCallback(async() => {
		if(!user?.isAdmin || !reviewTargetItemName){
			setPendingReports([]);
			setPendingReportSuggestedEdits({});
			setPendingReportsError(null);
			setPendingReportsLoading(false);
			return;
		}

		setPendingReportsLoading(true);
		setPendingReportsError(null);
		try{
			const reports = await itemEditReportService.getItemReports(reviewTargetItemName, "PENDING");
			setPendingReports(reports);
			setPendingReportSuggestedEdits((prev) => {
				const next:Record<number, string> = {};
				for(const report of reports){
					next[report.suggestionId] = prev[report.suggestionId] ?? normalizeMultilineText(report.suggestedValue || "");
				}
				return next;
			});
		}catch(err){
			console.error("Failed to load pending item edit reports:", err);
			setPendingReportsError("제보 목록을 불러오지 못했습니다.");
		}finally{
			setPendingReportsLoading(false);
		}
	}, [reviewTargetItemName, user?.isAdmin]);

	useEffect(() => {
		loadPendingReports();
	}, [loadPendingReports]);

	useEffect(() => {
		if(!user?.isAdmin || pendingReports.length <= 0 || !reviewTargetItemName){
			return;
		}
		if(autoOpenedFloatingForItemRef.current === reviewTargetItemName){
			return;
		}
		autoOpenedFloatingForItemRef.current = reviewTargetItemName;
		setShowAdminReviewFloating(true);
	}, [pendingReports.length, reviewTargetItemName, user?.isAdmin]);

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
	const displayItemEffect = normalizeMultilineText(itemSummary?.itemEffect || itemData?.itemEffect || "");
	const parsedTranscendence = useMemo(
		() => parseItemTranscendence(itemSummary?.itemTranscendence ?? itemData?.itemTranscendence),
		[itemSummary?.itemTranscendence, itemData?.itemTranscendence]
	);
	const rarityInfo = getItemRarityInfo(displayItemRarity);
	const barterAcquireCount = bartersByItemId.length;
	const barterMaterialCount = bartersByExchangeId.length;
	const craftRecipeCount = Object.keys(craftsBySubId).length;
	const formatReportCreatedAt = (value:string):string => {
		const date = new Date(value);
		if(Number.isNaN(date.getTime())){
			return value;
		}
		return date.toLocaleString();
	};
	const getAdminSuggestedEditValue = (report:ItemEditSuggestion):string => {
		return pendingReportSuggestedEdits[report.suggestionId] ?? normalizeMultilineText(report.suggestedValue || "");
	};
	const handleAdminSuggestedEditChange = (reportId:number, nextValue:string) => {
		setPendingReportSuggestedEdits((prev) => ({
			...prev,
			[reportId] : normalizeMultilineText(nextValue)
		}));
	};
	const handleOpenReportModal = () => setShowReportModal(true);
	const handleCloseReportModal = () => setShowReportModal(false);
	const handleToggleAdminReviewFloating = () => setShowAdminReviewFloating((prev) => !prev);
	const handleAdminReview = async(report:ItemEditSuggestion, action:"approve" | "reject") => {
		setPendingReportActionId(report.suggestionId);
		setPendingReportsError(null);
		try{
			if(action === "approve"){
				const editedSuggestedValue = getAdminSuggestedEditValue(report).trim();
				if(!editedSuggestedValue){
					setPendingReportsError("제안값이 비어 있으면 반영할 수 없습니다.");
					return;
				}
				await itemEditReportService.approveReport(report.suggestionId, {
					suggestedValue : editedSuggestedValue
				});
			}else{
				await itemEditReportService.rejectReport(report.suggestionId);
			}
			await loadPendingReports();
		}catch(err){
			console.error("Failed to review item edit report:", err);
			setPendingReportsError(action === "approve" ? "제보 반영 처리에 실패했습니다." : "제보 반려 처리에 실패했습니다.");
		}finally{
			setPendingReportActionId(null);
		}
	};

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

							{displayItemEffect && (
								<section className={styles.infoBlock}>
									<div className={styles.infoBlockHeader}>
										<h3>아이템 효과</h3>
										<span>게임 내 설명 기준</span>
									</div>
									<div className={styles.itemEffect}>{displayItemEffect}</div>
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
				{user?.isAdmin && pendingReports.length > 0 && (
					<div className={styles.adminFloating}>
						<button
							type="button"
							className={styles.adminFloatingToggle}
							onClick={handleToggleAdminReviewFloating}
							aria-expanded={showAdminReviewFloating}
						>
							<ShieldCheck size={16}/>
							<span>{"제보 " + pendingReports.length + "건"}</span>
						</button>
						{showAdminReviewFloating && (
							<div className={styles.adminFloatingPanel}>
								<div className={styles.adminFloatingHeader}>
									<strong>{"대기 제보 목록"}</strong>
									<button
										type="button"
										className={styles.adminFloatingRefreshBtn}
										onClick={loadPendingReports}
										disabled={pendingReportsLoading}
									>
										{pendingReportsLoading ? "불러오는 중..." : "새로고침"}
									</button>
								</div>
								{pendingReportsError && (
									<div className={styles.adminFloatingError}>{pendingReportsError}</div>
								)}
								<div className={styles.adminFloatingList}>
									{pendingReports.map((report) => (
										<div key={report.suggestionId} className={styles.adminFloatingCard}>
											<div className={styles.adminFloatingBadges}>
												<span className={styles.adminFloatingBadge}>{report.targetType}</span>
												<span className={styles.adminFloatingBadgeMuted}>
													{getItemEditFieldLabel(report.fieldKey, displayItemSubMenu, displayItemType)}
												</span>
											</div>
											<div className={styles.adminFloatingMeta}>
												<span>{report.requesterNickname || "-"}</span>
												<span>{formatReportCreatedAt(report.createdAt)}</span>
											</div>
											<div className={styles.adminFloatingValues}>
												<div>
													<label>{"현재값"}</label>
													<pre>{normalizeMultilineText(report.currentValue) || "-"}</pre>
												</div>
												<div>
													<label>{"제안값"}</label>
													<textarea
														value={getAdminSuggestedEditValue(report)}
														onChange={(e) => handleAdminSuggestedEditChange(report.suggestionId, e.target.value)}
														rows={3}
														disabled={pendingReportActionId === report.suggestionId}
													/>
												</div>
											</div>
											{report.reason && (
												<div className={styles.adminFloatingReason}>
													<label>{"사유"}</label>
													<p>{normalizeMultilineText(report.reason)}</p>
												</div>
											)}
											<div className={styles.adminFloatingActions}>
												<button
													type="button"
													className={styles.adminApproveBtn}
													onClick={() => handleAdminReview(report, "approve")}
													disabled={pendingReportActionId === report.suggestionId}
												>
													<Check size={14}/>
													<span>{pendingReportActionId === report.suggestionId ? "처리 중..." : "반영"}</span>
												</button>
												<button
													type="button"
													className={styles.adminRejectBtn}
													onClick={() => handleAdminReview(report, "reject")}
													disabled={pendingReportActionId === report.suggestionId}
												>
													<X size={14}/>
													<span>{"반려"}</span>
												</button>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default ItemDetailPage;
