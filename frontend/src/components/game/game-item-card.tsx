import React, {useMemo} from "react";
import {Info, Package, RefreshCw, Hammer, MapPin, User} from "lucide-react";
import {getItemRarityInfo, normalizeMultilineText, parseItemTranscendence} from "@/utils";
import styles from "./game-item-card.module.scss";
import type {GameItemCardProps, GroupedBarterSource} from "@/types/ui";

const GameItemCard:React.FC<GameItemCardProps> = ({item, onClick}) => {
	const groupedBarterSources = useMemo<GroupedBarterSource[]>(() => {
		if(!item.barterSources || item.barterSources.length === 0){
			return [];
		}

		const groupMap = new Map<string, GroupedBarterSource>();
		item.barterSources.forEach((barter) => {
			const key = `${barter.regionName || ""}-${barter.npcName || ""}`;
			if(groupMap.has(key)){
				groupMap.get(key)!.count++;
			}else{
				groupMap.set(key, {
					regionName : barter.regionName,
					npcName : barter.npcName,
					count : 1
				});
			}
		});

		return Array.from(groupMap.values());
	}, [item.barterSources]);

	const rarityInfo = getItemRarityInfo(item.itemRarity);
	const parsedTranscendence = useMemo(
		() => parseItemTranscendence(item.itemTranscendence),
		[item.itemTranscendence]
	);
	const displayItemEffect = useMemo(() => normalizeMultilineText(item.itemEffect), [item.itemEffect]);
	const displayItemSource = useMemo(() => normalizeMultilineText(item.itemSource), [item.itemSource]);
	const normalizedSubMenu = useMemo(() => normalizeMultilineText(item.itemSubMenu ?? "").trim(), [item.itemSubMenu]);
	const normalizedItemType = useMemo(() => normalizeMultilineText(item.itemType ?? "").trim(), [item.itemType]);
	const hideSubMenuBadge = normalizedSubMenu.length > 0 && normalizedSubMenu === normalizedItemType;
	const transcendencePreviewRows = parsedTranscendence.rows.slice(0, 2);

	return (
		<div
			className={`${styles.card} ${onClick ? styles.clickable : ""}`}
			onClick={() => onClick?.(item)}
			style={{"--rarity-color" : rarityInfo.color, "--rarity-bg" : rarityInfo.bg} as React.CSSProperties}
		>
			<div className={styles.rarityIndicator}/>

			<div className={styles.cardContent}>
				<div className={styles.header}>
					<div className={styles.iconWrapper}>
						<Package size={20}/>
					</div>
					<div className={styles.metaRow}>
						<span className={styles.rarity}>{rarityInfo.label}</span>
						<span
							className={`${styles.badgeMuted} ${styles.badgeMainMenu}`}
							title={`상위 메뉴: ${item.itemMainMenu || "-"}`}
						>
							{item.itemMainMenu || "-"}
						</span>
						{!hideSubMenuBadge && (
							<span
								className={`${styles.badgeMuted} ${styles.badgeSubMenu}`}
								title={`하위 메뉴: ${item.itemSubMenu || "-"}`}
							>
								{item.itemSubMenu || "-"}
							</span>
						)}
						<span
							className={`${styles.badgeMuted} ${styles.badgeType}`}
							title={hideSubMenuBadge ? `하위 메뉴 / 유형: ${item.itemType || "-"}` : `유형: ${item.itemType || "-"}`}
						>
							{item.itemType || "-"}
						</span>
					</div>
				</div>

				<h3 className={styles.name}>{item.itemName || "Unknown item"}</h3>

				{displayItemSource && (
					<div className={styles.itemSourcePreview}>
						<span className={styles.itemSourceLabel}>{"아이템 출처"}</span>
						<p className={styles.itemSourceText}>{displayItemSource}</p>
					</div>
				)}

				{displayItemEffect && (
					<p className={styles.effect}>{displayItemEffect}</p>
				)}

				{(transcendencePreviewRows.length > 0 || parsedTranscendence.parseError) && (
					<div className={styles.transcendencePreview}>
						<div className={styles.transcendencePreviewHeader}>
							<span className={styles.transcendenceBadge}>초월</span>
							{parsedTranscendence.rows.length > transcendencePreviewRows.length && (
								<span className={styles.transcendenceMore}>+{parsedTranscendence.rows.length - transcendencePreviewRows.length}개</span>
							)}
						</div>
						{transcendencePreviewRows.length > 0 ? (
							<div className={styles.transcendencePreviewList}>
								{transcendencePreviewRows.map((row) => (
									<div key={row.key} className={styles.transcendencePreviewRow}>
										<span className={styles.transcendencePreviewLabel}>{row.label}</span>
										{row.tierValues ? (
											<div className={styles.transcendencePreviewValues}>
												{row.tierValues.map((tier) => (
													<span key={`${row.key}-${tier.tier}`} className={styles.transcendenceTierChip}>
														{tier.tier} {tier.value}
													</span>
												))}
											</div>
										) : (
											<span className={styles.transcendencePreviewValue}>{row.value}</span>
										)}
									</div>
								))}
							</div>
						) : (
							<div className={styles.transcendenceRawHint}>초월 데이터 형식 확인 필요</div>
						)}
					</div>
				)}

				{(item.hasBarterSource || item.hasCraftSource) && (
					<div className={styles.sourceSection}>
						{item.hasBarterSource && groupedBarterSources.length > 0 && (
							<div className={styles.sourceInfo}>
								<div className={styles.sourceHeader}>
									<RefreshCw size={14}/>
									<span>{"물물교환"}</span>
								</div>
								<div className={styles.sourceList}>
									{groupedBarterSources.slice(0, 3).map((group, idx) => (
										<div key={idx} className={styles.sourceItem}>
											{group.regionName && (
												<span className={styles.sourceLocation}>
													<MapPin size={12}/>
													{group.regionName}
												</span>
											)}
											{group.npcName && (
												<span className={styles.sourceNpc}>
													<User size={12}/>
													{group.npcName}
												</span>
											)}
											{group.count > 1 && (
												<span className={styles.sourceCount}>x{group.count}</span>
											)}
										</div>
									))}
									{groupedBarterSources.length > 3 && (
										<span className={styles.sourceMore}>+{groupedBarterSources.length - 3}{"개"}</span>
									)}
								</div>
							</div>
						)}

						{item.hasCraftSource && (
							<div className={styles.sourceInfo}>
								<div className={styles.sourceHeader}>
									<Hammer size={14}/>
									<span>{"제작 가능"}</span>
								</div>
								<span className={styles.craftCount}>
									{item.craftRecipeCount}{"개 레시피"}
								</span>
							</div>
						)}
					</div>
				)}
			</div>

			{onClick && (
				<div className={styles.clickHint}>
					<Info size={14}/>
					<span>{"상세정보 보기"}</span>
				</div>
			)}
		</div>
	);
};

export default GameItemCard;
