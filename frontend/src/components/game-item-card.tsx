import React from "react";
import {GameItem} from "@/types";
import styles from "@/assets/styles/game-items.module.scss";

interface GameItemCardProps{
	item:GameItem;
	onClick?:(item:GameItem) => void;
}

const GameItemCard:React.FC<GameItemCardProps> = ({item, onClick}) => {
	console.log("🎴 GameItemCard 렌더링:", item);
	const getRarityColor = (rarity:string) => {
		switch(rarity?.toLowerCase()){
			case "일반":
				return "#6b7280";
			case "고급":
				return "#10b981";
			case "희귀":
				return "#3b82f6";
			case "영웅":
				return "#8b5cf6";
			case "전설":
				return "#f59e0b";
			case "신화":
				return "#ef4444";
			default:
				return "#6b7280";
		}
	};
	
	return (
		<div
			className={styles.gameItemCard}
			onClick={() => onClick?.(item)}
			style={{cursor : onClick ? "pointer" : "default"}}
		>
			<div className={styles.itemHeader}>
				<span className={styles.itemId}>ID: {item.itemId}</span>
				<span
					className={styles.itemRarity}
					style={{color : getRarityColor(item.itemRarity)}}
				>
          {item.itemRarity || "N/A"}
        </span>
			</div>
			
			<h3 className={styles.itemName}>{item.itemName || "N/A"}</h3>
			
			<div className={styles.itemType}>
				<span className={styles.typeLabel}>타입:</span>
				<span className={styles.typeValue}>{item.itemType || "N/A"}</span>
			</div>
			
			<div className={styles.itemEffect}>
				{item.itemEffect || "설명이 없습니다."}
			</div>
		</div>
	);
};

export default GameItemCard;
