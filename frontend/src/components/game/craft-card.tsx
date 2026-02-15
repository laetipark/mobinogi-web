import React from "react";
import styles from "@/pages/game/game-items.module.scss";
import {Hammer, Info} from "lucide-react";
import type {CraftCardProps} from "@/types/ui";

const CraftCard:React.FC<CraftCardProps> = ({craft, onClick}) => {
	return (
		<div
			className={`${styles.craftCard} ${onClick ? styles.clickable : ""}`}
			onClick={() => onClick?.(craft)}
		>
			<div className={styles.craftHeader}>
				<Hammer size={20} className={styles.craftIcon}/>
			</div>

			<div className={styles.craftContent}>
				<div className={styles.craftResult}>
					<span className={styles.craftLabel}>제작 아이템</span>
					<span className={styles.craftItemName}>{craft.gameItem?.itemName || "N/A"}</span>
				</div>

				<div className={styles.craftIngredient}>
					<span className={styles.craftLabel}>재료</span>
					<div className={styles.ingredientInfo}>
						<span className={styles.ingredientName}>{craft.ingredientItem?.itemName || "N/A"}</span>
						<span className={styles.ingredientCost}>x{craft.craftIngredientCost}</span>
					</div>
				</div>
			</div>

			{onClick && craft.gameItem && (
				<div className={styles.clickHint}>
					<Info size={14}/>
					<span>클릭하여 아이템 상세정보 보기</span>
				</div>
			)}
		</div>
	);
};

export default CraftCard;
