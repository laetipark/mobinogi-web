import React, {useMemo} from "react";
import {Info, Package, RefreshCw, Hammer, MapPin, User} from "lucide-react";
import {getItemRarityInfo} from "@/utils";
import styles from "./game-item-card.module.scss";
import type {GameItemCardProps, GroupedBarterSource} from "@/types/ui";

// 지역+NPC 기준으로 그룹화된 물물교환 정보
const GameItemCard:React.FC<GameItemCardProps> = ({item, onClick}) => {
	// 지역+NPC가 같은 물물교환 정보를 그룹화
	const groupedBarterSources = useMemo<GroupedBarterSource[]>(() => {
		if(!item.barterSources || item.barterSources.length === 0) return [];
		
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
	
	return (
		<div
			className={`${styles.card} ${onClick ? styles.clickable : ""}`}
			onClick={() => onClick?.(item)}
			style={{"--rarity-color" : rarityInfo.color, "--rarity-bg" : rarityInfo.bg} as React.CSSProperties}
		>
			{/* 희귀도 인디케이터 */}
			<div className={styles.rarityIndicator}/>
			
			{/* 헤더 */}
			<div className={styles.header}>
				<div className={styles.iconWrapper}>
					<Package size={20}/>
				</div>
				<div className={styles.meta}>
					<span className={styles.rarity}>{rarityInfo.label}</span>
				</div>
			</div>
			
			{/* 아이템 이름 */}
			<h3 className={styles.name}>{item.itemName || "Unknown item"}</h3>
			
			{/* 타입 */}
			<div className={styles.type}>
				<span className={styles.typeLabel}>타입</span>
				<span className={styles.typeValue}>{item.itemType || "N/A"}</span>
			</div>
			
			{/* 설명 */}
			{item.itemEffect && (
				<p className={styles.effect}>{item.itemEffect}</p>
			)}
			
			{/* 획득 방법 섹션 */}
			{(item.hasBarterSource || item.hasCraftSource) && (
				<div className={styles.sourceSection}>
					{/* 물물교환 정보 (지역+NPC 그룹) */}
					{item.hasBarterSource && groupedBarterSources.length > 0 && (
						<div className={styles.sourceInfo}>
							<div className={styles.sourceHeader}>
								<RefreshCw size={14}/>
								<span>물물교환</span>
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
									<span className={styles.sourceMore}>
										+{groupedBarterSources.length - 3}개 더
									</span>
								)}
							</div>
						</div>
					)}
					
					{/* 제작 정보 */}
					{item.hasCraftSource && (
						<div className={styles.sourceInfo}>
							<div className={styles.sourceHeader}>
								<Hammer size={14}/>
								<span>제작 가능</span>
							</div>
							<span className={styles.craftCount}>
								{item.craftRecipeCount}개 레시피
							</span>
						</div>
					)}
				</div>
			)}
			
			{/* 클릭 힌트 - 최하단 상세 카드 */}
			{onClick && (
				<div className={styles.clickHint}>
					<Info size={14}/>
					<span>상세정보 보기</span>
				</div>
			)}
		</div>
	);
};

export default GameItemCard;
