import React, {useEffect, useState} from "react";
import styles from "./todo.module.scss";
import {UserTodoBarter} from "../../types";
import {todoService} from "../../services/todo-service";
import BarterSettingsModal from "./barter-settings-modal";

interface BarterCartProps{
	characterId:number;
	cycle:number;
	cycleLabel:string;
}

const TXT = {
	barter: "\uBB3C\uBB3C\uAD50\uD658",
	loading: "\uB85C\uB529 \uC911...",
	empty: "\uC124\uC815\uC5D0\uC11C \uBB3C\uBB3C\uAD50\uD658\uC744 \uCD94\uAC00\uD558\uC138\uC694"
} as const;

const BarterCart:React.FC<BarterCartProps> = ({characterId, cycle, cycleLabel}) => {
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

		setBarters(prev => prev.map(b => (b.id === id ? {...b, completed: !b.completed} : b)));

		try{
			await todoService.toggleBarterComplete(characterId, id);
		}catch(err){
			setBarters(prev => prev.map(b => (b.id === id ? {...b, completed: !b.completed} : b)));
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

	if(loading){
		return <div className={styles.loading}>{TXT.loading}</div>;
	}

	const completedCount = filteredBarters.filter(b => b.completed).length;

	return (
		<div className={styles.barterCart}>
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
					{filteredBarters.map(barter => (
						<button
							key={barter.id}
							className={`${styles.bossItem} ${barter.completed ? styles.completed : ""}`}
							onClick={() => handleToggle(barter.id)}
							title={[barter.regionName, barter.npcName].filter(Boolean).join(" - ")}
						>
							<span className={styles.bossCheckmark}>{barter.completed && "\u2713"}</span>
							<span className={styles.bossName}>{barter.itemName || TXT.barter}</span>
							<span className={styles.bossRegion}>{[barter.regionName, barter.npcName].filter(Boolean).join(" - ") || "N/A"}</span>
							<span className={styles.bossDifficulty}>{barter.exchangeItemName ? `${barter.exchangeItemName} x${barter.exchangeCost}` : "N/A"}</span>
						</button>
					))}
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
