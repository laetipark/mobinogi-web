import React from "react";
import styles from "@/pages/game/game-items.module.scss";
import {ArrowLeftRight, ArrowRight, Info} from "lucide-react";
import type {BarterCardProps} from "@/types/ui";

const toSafeBarterCount = (value:unknown):number => {
	const parsed = Number(value);
	if(!Number.isFinite(parsed) || parsed < 0){
		return 0;
	}
	return Math.trunc(parsed);
};

const BarterCard:React.FC<BarterCardProps> = ({barter, onClick}) => {
	const rewardPerTrade = toSafeBarterCount(barter.itemWeight);
	const maxTrades = toSafeBarterCount(barter.barterQty);
	const totalReward = rewardPerTrade * maxTrades;
	const hasServerShare = Number(barter.barterServer) > 0;
	const hasNpcShare = Number(barter.barterNpc) > 0;
	const hasShareInfo = hasServerShare || hasNpcShare;

	return (
		<div
			className={`${styles.barterCard} ${onClick ? styles.clickable : ""}`}
			onClick={() => onClick?.(barter)}
		>
			<div className={styles.barterHeader}>
				<ArrowLeftRight size={20} className={styles.barterIcon}/>
				<div className={styles.barterMetaRow}>
					<span className={styles.barterBadge}>{barter.gameRegion?.regionName || "N/A"}</span>
					<span className={styles.barterBadgeMuted}>{barter.gameNpc?.npcName || "N/A"}</span>
				</div>
			</div>

			<div className={styles.barterExchange}>
				<div className={styles.barterItem}>
					<span className={styles.barterLabel}>{"교환 아이템"}</span>
					<span className={styles.barterValue}>{barter.exchangeItem?.itemName || "N/A"}</span>
					<span className={styles.barterCost}>x{barter.exchangeCost}</span>
				</div>

				<ArrowRight className={styles.arrowIcon} size={24}/>

				<div className={styles.barterItem}>
					<span className={styles.barterLabel}>{"획득 아이템"}</span>
					<span className={styles.barterValue}>{barter.gameItem?.itemName || "N/A"}</span>
					<span className={styles.barterCost}>x{rewardPerTrade}</span>
					<span className={styles.barterSubInfo}>최대 {maxTrades}회 · 총 x{totalReward}</span>
				</div>
			</div>

			{hasShareInfo && (
				<div className={styles.barterInfo}>
					{hasServerShare && <span className={styles.barterTag}>{"서버 공유"}</span>}
					{hasNpcShare && <span className={styles.barterTag}>{"NPC 공유"}</span>}
				</div>
			)}

			{onClick && barter.gameItem && (
				<div className={styles.clickHint}>
					<Info size={14}/>
					<span>{"클릭하여 아이템 상세정보 보기"}</span>
				</div>
			)}
		</div>
	);
};

export default BarterCard;
