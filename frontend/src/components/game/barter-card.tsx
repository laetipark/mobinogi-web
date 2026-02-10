import React from "react";
import {LifeBarter} from "@/types";
import styles from "@/pages/game/game-items.module.scss";
import {ArrowRight, Info} from "lucide-react";

interface BarterCardProps{
	barter:LifeBarter;
	onClick?:(barter:LifeBarter) => void;
}

const BarterCard:React.FC<BarterCardProps> = ({barter, onClick}) => {
	return (
		<div
			className={`${styles.barterCard} ${onClick ? styles.clickable : ""}`}
			onClick={() => onClick?.(barter)}
		>
			<div className={styles.barterHeader}>
				<span className={styles.barterId}>ID: {barter.barterId}</span>
				<span className={styles.barterLocation}>
					{barter.gameRegion?.regionName || "N/A"} - {barter.gameNpc?.npcName || "N/A"}
				</span>
			</div>

			<div className={styles.barterExchange}>
				<div className={styles.barterItem}>
					<span className={styles.barterLabel}>교환 아이템</span>
					<span className={styles.barterValue}>{barter.exchangeItem?.itemName || "N/A"}</span>
					<span className={styles.barterCost}>x{barter.exchangeCost}</span>
				</div>

				<ArrowRight className={styles.arrowIcon} size={24}/>

				<div className={styles.barterItem}>
					<span className={styles.barterLabel}>획득 아이템</span>
					<span className={styles.barterValue}>{barter.gameItem?.itemName || "N/A"}</span>
					<span className={styles.barterCost}>x{barter.barterQty}</span>
				</div>
			</div>

			<div className={styles.barterInfo}>
				<span>무게: {barter.itemWeight}</span>
				{barter.barterServer && <span className={styles.barterTag}>서버 공유</span>}
				{barter.barterNpc && <span className={styles.barterTag}>NPC 공유</span>}
			</div>

			{onClick && barter.gameItem && (
				<div className={styles.clickHint}>
					<Info size={14}/>
					<span>클릭하여 아이템 상세정보 보기</span>
				</div>
			)}
		</div>
	);
};

export default BarterCard;
