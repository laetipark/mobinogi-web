import React from "react";
import {RefreshCw} from "lucide-react";
import type {GameItemSummary, LifeBarter, LifeCraft} from "@/types";
import GameItemCard from "@/components/game/game-item-card";
import BarterCard from "@/components/game/barter-card";
import CraftCard from "@/components/game/craft-card";
import type {TabType} from "../game-items-domain";
import styles from "@/pages/game/game-items.module.scss";

type GameItemsResultsProps = {
	activeTab:TabType;
	keyword:string;
	totalElements:number;
	currentDataLength:number;
	tabTitle:string;
	items:GameItemSummary[];
	barters:LifeBarter[];
	crafts:LifeCraft[];
	onItemClick:(item:GameItemSummary) => void;
	onBarterClick:(barter:LifeBarter) => void;
	onCraftClick:(craft:LifeCraft) => void;
	loading:boolean;
	hasMoreData:boolean;
};

const GameItemsResults:React.FC<GameItemsResultsProps> = ({
	activeTab,
	keyword,
	totalElements,
	currentDataLength,
	tabTitle,
	items,
	barters,
	crafts,
	onItemClick,
	onBarterClick,
	onCraftClick,
	loading,
	hasMoreData
}) => (
	<>
		<div className={styles.resultsInfo}>
			{keyword ? (
				<p>{"검색 결과: 총 " + totalElements + "개 " + tabTitle + " 중 " + currentDataLength + "개 표시"}</p>
			) : (
				<p>{"총 " + totalElements + "개 " + tabTitle + " 중 " + currentDataLength + "개 표시"}</p>
			)}
		</div>

		<div className={styles.itemsGrid}>
			{activeTab === "items" && items.map((item) => (
				<GameItemCard
					key={item.itemId}
					item={item}
					onClick={onItemClick}
				/>
			))}
			{activeTab === "barter" && barters.map((barter) => (
				<BarterCard
					key={`${barter.barterId}-${barter.itemId}-${barter.exchangeId}`}
					barter={barter}
					onClick={onBarterClick}
				/>
			))}
			{activeTab === "craft" && crafts.map((craft) => (
				<CraftCard
					key={`${craft.craftId}-${craft.craftSubId}-${craft.craftIngredientId}`}
					craft={craft}
					onClick={onCraftClick}
				/>
			))}
		</div>

		{loading && (
			<div className={styles.loadingContainer}>
				<RefreshCw className={styles.spinning} size={24}/>
				<span>{"데이터를 불러오는 중.."}</span>
			</div>
		)}

		{!hasMoreData && currentDataLength > 0 && (
			<div className={styles.noMoreData}>{"더 이상 불러올 데이터가 없습니다."}</div>
		)}

		{!loading && currentDataLength === 0 && (
			<div className={styles.noData}>
				{keyword ? "검색 결과가 없습니다." : `${tabTitle}가 없습니다.`}
			</div>
		)}
	</>
);

export default GameItemsResults;
