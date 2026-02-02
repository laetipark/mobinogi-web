import React from "react";
import {GameItem} from "@/types";
import {Info, Package} from "lucide-react";
import styles from "./game-item-card.module.scss";

interface GameItemCardProps{
	item:GameItem;
	onClick?:(item:GameItem) => void;
}

const GameItemCard:React.FC<GameItemCardProps> = ({item, onClick}) => {
	const getRarityInfo = (rarity:string):{color:string; bg:string} => {
		const r = rarity?.toLowerCase() || "";
		switch(r){
			case "일반":
				return {color: "#6b7280", bg: "rgba(107, 114, 128, 0.1)"};
			case "고급":
				return {color: "#10b981", bg: "rgba(16, 185, 129, 0.1)"};
			case "희귀":
				return {color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)"};
			case "영웅":
				return {color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)"};
			case "전설":
				return {color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)"};
			case "신화":
				return {color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)"};
			default:
				return {color: "#6b7280", bg: "rgba(107, 114, 128, 0.1)"};
		}
	};

	const rarityInfo = getRarityInfo(item.itemRarity);

	return (
		<div
			className={`${styles.card} ${onClick ? styles.clickable : ""}`}
			onClick={() => onClick?.(item)}
			style={{"--rarity-color": rarityInfo.color, "--rarity-bg": rarityInfo.bg} as React.CSSProperties}
		>
			{/* 레어리티 인디케이터 */}
			<div className={styles.rarityIndicator}/>

			{/* 헤더 */}
			<div className={styles.header}>
				<div className={styles.iconWrapper}>
					<Package size={20}/>
				</div>
				<div className={styles.meta}>
					<span className={styles.id}>#{item.itemId}</span>
					<span className={styles.rarity}>{item.itemRarity || "일반"}</span>
				</div>
			</div>

			{/* 아이템 이름 */}
			<h3 className={styles.name}>{item.itemName || "알 수 없는 아이템"}</h3>

			{/* 타입 */}
			<div className={styles.type}>
				<span className={styles.typeLabel}>타입</span>
				<span className={styles.typeValue}>{item.itemType || "N/A"}</span>
			</div>

			{/* 설명 */}
			{item.itemEffect && (
				<p className={styles.effect}>{item.itemEffect}</p>
			)}

			{/* 클릭 힌트 */}
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
