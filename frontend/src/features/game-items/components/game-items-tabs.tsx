import React from "react";
import {ArrowLeftRight, Hammer, Package} from "lucide-react";
import type {TabType} from "../game-items-domain";
import styles from "@/pages/game/game-items.module.scss";

type GameItemsTabsProps = {
	activeTab:TabType;
	onTabChange:(tab:TabType) => void;
};

const GameItemsTabs:React.FC<GameItemsTabsProps> = ({activeTab, onTabChange}) => (
	<div className={styles.tabContainer}>
		<button
			className={`${styles.tabButton} ${activeTab === "items" ? styles.active : ""}`}
			onClick={() => onTabChange("items")}
		>
			<Package size={18}/>
			<span>{"아이템"}</span>
		</button>
		<button
			className={`${styles.tabButton} ${activeTab === "barter" ? styles.active : ""}`}
			onClick={() => onTabChange("barter")}
		>
			<ArrowLeftRight size={18}/>
			<span>{"물물교환"}</span>
		</button>
		<button
			className={`${styles.tabButton} ${activeTab === "craft" ? styles.active : ""}`}
			onClick={() => onTabChange("craft")}
		>
			<Hammer size={18}/>
			<span>{"제작"}</span>
		</button>
	</div>
);

export default GameItemsTabs;
