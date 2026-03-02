import React from "react";
import styles from "@/pages/game/game-items.module.scss";
import {Hammer, Info} from "lucide-react";
import type {CraftCardProps} from "@/types/ui";

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

const CraftCard:React.FC<CraftCardProps> = ({craft, onClick}) => {
	return (
		<div
			className={`${styles.craftCard} ${onClick ? styles.clickable : ""}`}
			onClick={() => onClick?.(craft)}
		>
			<div className={styles.craftHeader}>
				<Hammer size={20} className={styles.craftIcon}/>
				<div className={styles.craftMetaRow}>
					<span className={styles.craftBadge}>{craft.craftType}</span>
					<span className={styles.craftBadgeMuted}>{craft.craftName}</span>
				</div>
			</div>

			<div className={styles.craftContent}>
				<div className={styles.craftResult}>
					<span className={styles.craftLabel}>{"제작 아이템"}</span>
					<span className={styles.craftItemName}>{craft.itemName || craft.gameItem?.itemName || "N/A"}</span>
				</div>

				<div className={styles.craftIngredient}>
					<span className={styles.craftLabel}>{"재료"}</span>
					<div className={styles.ingredientInfo}>
						<span className={styles.ingredientName}>{craft.ingredientName || craft.ingredientItem?.itemName || "N/A"}</span>
						<span className={styles.ingredientCost}>x{craft.craftIngredientCost}</span>
					</div>
				</div>

				<div className={styles.craftInfoRow}>
					{craft.craftableLevel !== null && craft.craftableLevel !== undefined && (
						<span className={styles.craftInfo}>{"레벨"} {craft.craftableLevel}</span>
					)}
					<span className={styles.craftInfo}>{"소요"} {formatProcessingTime(craft.processingTime)}</span>
				</div>
			</div>

			{onClick && (craft.itemName || craft.gameItem) && (
				<div className={styles.clickHint}>
					<Info size={14}/>
					<span>{"클릭하여 아이템 상세정보 보기"}</span>
				</div>
			)}
		</div>
	);
};

export default CraftCard;