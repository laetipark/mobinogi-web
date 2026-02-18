import React, {useEffect, useState} from "react";
import styles from "./todo.module.scss";
import {UserTodoBarter} from "@/types";
import {todoService} from "@/services/todo-service.ts";
import BarterSettingsModal from "./barter-settings-modal";
import type {BarterCartProps} from "@/types/ui";

const TXT = {
	barter : "물물교환",
	loading : "로딩 중...",
	empty : "설정에서 물물교환을 추가하세요"
} as const;

const BarterCart:React.FC<BarterCartProps> = ({characterId, cycle, cycleLabel, favoriteItems}) => {
	const [barters, setBarters] = useState<UserTodoBarter[]>([]);
	const [loading, setLoading] = useState(true);
	const [showSettings, setShowSettings] = useState(false);
	const [toggling, setToggling] = useState<Set<number>>(new Set());
	
	useEffect(() => {
		loadBarters();
	}, [characterId]);
	
	const loadBarters = async() => {
		try{
			setLoading(true);
			const data = await todoService.getBarterCart(characterId);
			setBarters(data);
		}catch(err){
			console.error("Failed to load barter cart:", err);
		}finally{
			setLoading(false);
		}
	};
	
	const handleToggle = async(id:number) => {
		if(toggling.has(id)) return;
		setToggling(prev => new Set(prev).add(id));
		
		setBarters(prev => prev.map(b => (b.id === id ? {...b, completed : !b.completed} : b)));
		
		try{
			const updated = await todoService.toggleBarterComplete(characterId, id);
			setBarters(prev => prev.map(b => (b.id === id ? {...b, ...updated} : b)));
		}catch(err){
			setBarters(prev => prev.map(b => (b.id === id ? {...b, completed : !b.completed} : b)));
			console.error("Failed to toggle barter:", err);
		}finally{
			setToggling(prev => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
		}
	};
	
	const filteredBarters = barters.filter(b => {
		if(b.barterInitCycle !== undefined && b.barterInitCycle !== null){
			return b.barterInitCycle === cycle;
		}
		if(cycle === 1) return b.barterCycle === "daily";
		return b.barterCycle === "weekly";
	});

	const getCheckedByLabel = (barter:UserTodoBarter):string => {
		if(!barter.completed){
			return "";
		}
		const nickname = barter.checkedByNickname?.trim();
		const characterName = barter.checkedByCharacterName?.trim();
		if(nickname && characterName){
			return `${nickname} (${characterName})`;
		}
		return nickname || characterName || "";
	};
	
	if(loading){
		return <div className={styles.loading}>{TXT.loading}</div>;
	}
	
	const completedCount = filteredBarters.filter(b => b.completed).length;
	
	return (
		<div className={`${styles.barterCart} ${cycle === 1 ? styles.dailyBarterCart : styles.weeklyBarterCart}`}>
			<div className={styles.sectionHeader}>
				<div className={styles.progressInfo}>
					<span className={styles.taskLabel}>{cycleLabel}</span>
					{filteredBarters.length > 0 && (
						<span className={styles.counterText}>{completedCount}/{filteredBarters.length}</span>
					)}
				</div>
				<button className={styles.settingsBtn} onClick={() => setShowSettings(true)}>&#9881;</button>
			</div>
			{filteredBarters.length > 0 ? (
				<div className={styles.bossGrid}>
					{filteredBarters.map(barter => {
						const checkedBy = getCheckedByLabel(barter);
						return (
						<button
							key={barter.id}
							className={`${styles.bossItem} ${barter.completed ? styles.completed : ""}`}
							onClick={() => handleToggle(barter.id)}
							title={[barter.regionName, barter.npcName].filter(Boolean).join(" - ")}
						>
							<span className={styles.bossCheckmark}>{barter.completed && "✓"}</span>
							<span className={styles.bossName}>{barter.itemName || TXT.barter}</span>
							<span
								className={styles.bossRegion}>{[barter.regionName, barter.npcName].filter(Boolean).join(" - ") || "N/A"}</span>
							<span
								className={styles.bossDifficulty}>{barter.exchangeItemName ? `${barter.exchangeItemName} x${barter.exchangeCost}` : "N/A"}</span>
							{checkedBy && <span className={styles.barterCheckedBy}>체크: {checkedBy}</span>}
						</button>
						);
					})}
				</div>
			) : (
				<div className={styles.emptyTracked}>{TXT.empty}</div>
			)}
			
			{showSettings && (
				<BarterSettingsModal
					characterId={characterId}
					cycle={cycle}
					cycleLabel={cycleLabel}
					existingBarters={filteredBarters}
					favoriteItems={favoriteItems}
					onUpdate={(updated) => {
						const otherBarters = barters.filter(b => {
							if(b.barterInitCycle !== undefined && b.barterInitCycle !== null){
								return b.barterInitCycle !== cycle;
							}
							if(cycle === 1) return b.barterCycle !== "daily";
							return b.barterCycle !== "weekly";
						});
						setBarters([...otherBarters, ...updated]);
					}}
					onClose={() => setShowSettings(false)}
				/>
			)}
		</div>
	);
};

export default BarterCart;
