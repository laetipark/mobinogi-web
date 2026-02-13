import React, {useMemo} from "react";
import styles from "./todo.module.scss";
import {GameMonster} from "../../types";
import {getDifficultyLabel} from "../../utils";

interface BossChecklistProps{
	label:string;
	monsters:GameMonster[];
	completedIds:number[];
	onChange:(completedIds:number[]) => void;
	maxCompleted?:number;
	groupByName?:boolean;
	visualGroup?:boolean;
	allowDuplicates?:boolean;
	trackedIds?:number[];
}

const BossChecklist:React.FC<BossChecklistProps> = ({label, monsters, completedIds, onChange, maxCompleted, groupByName, visualGroup, allowDuplicates, trackedIds}) => {
	const handleToggle = (monsterId:number) => {
		const monster = monsters.find(m => m.monsterId === monsterId);
		if(completedIds.includes(monsterId)){
			onChange(completedIds.filter(id => id !== monsterId));
		}else{
			let newCompleted = [...completedIds];
			if(groupByName && monster){
				const sameNameIds = monsters.filter(m => m.monsterName === monster.monsterName).map(m => m.monsterId);
				newCompleted = newCompleted.filter(id => !sameNameIds.includes(id));
			}
			newCompleted.push(monsterId);
			if(maxCompleted && newCompleted.length > maxCompleted){
				return;
			}
			onChange(newCompleted);
		}
	};

	const handleDuplicateSlotToggle = (monsterId:number, slotIndex:number, maxCount:number) => {
		const currentCount = completedIds.filter(id => id === monsterId).length;
		const isCompletedSlot = slotIndex < currentCount;
		if(isCompletedSlot){
			const removeIndex = completedIds.lastIndexOf(monsterId);
			if(removeIndex === -1) return;
			onChange([...completedIds.slice(0, removeIndex), ...completedIds.slice(removeIndex + 1)]);
			return;
		}
		if(maxCompleted !== undefined && completedIds.length >= maxCompleted){
			return;
		}
		if(currentCount >= maxCount){
			return;
		}
		onChange([...completedIds, monsterId]);
	};

	const groups = useMemo(() => {
		if(!visualGroup && !allowDuplicates) return null;
		const result:{name:string; monsters:GameMonster[]}[] = [];
		for(const m of monsters){
			const last = result[result.length - 1];
			if(last && last.name === m.monsterName){
				last.monsters.push(m);
			}else{
				result.push({name: m.monsterName, monsters: [m]});
			}
		}
		return result;
	}, [monsters, visualGroup, allowDuplicates]);

	const getRegionText = (monster:GameMonster) => monster.regionName || "N/A";

	if(monsters.length === 0){
		return (
			<div className={styles.taskItem}>
				<div className={styles.taskLabelRow}>
					<span className={styles.taskLabel}>{label}</span>
				</div>
				<div className={styles.emptyTracked}>설정에서 추적할 항목을 선택해주세요.</div>
			</div>
		);
	}

	if(allowDuplicates && trackedIds){
		const monsterCounts = new Map<number, number>();
		for(const id of trackedIds){
			monsterCounts.set(id, (monsterCounts.get(id) || 0) + 1);
		}
		const perMonsterSlotIndex = new Map<number, number>();
		const trackedSlots = trackedIds.map((monsterId, idx) => {
			const slotIndex = perMonsterSlotIndex.get(monsterId) || 0;
			perMonsterSlotIndex.set(monsterId, slotIndex + 1);
			return {key: `${monsterId}_${idx}`, monsterId, slotIndex};
		});
		const totalTracked = trackedIds.length;
		const totalCompleted = Math.min(completedIds.length, maxCompleted ?? totalTracked);

		return (
			<div className={styles.taskItem}>
				<div className={styles.taskLabelRow}>
					<span className={styles.taskLabel}>{label}</span>
					<span className={styles.counterText}>{totalCompleted}/{maxCompleted ?? totalTracked}</span>
				</div>
				<div className={styles.bossGrid}>
					{trackedSlots.map(slot => {
						const monster = monsters.find(m => m.monsterId === slot.monsterId);
						if(!monster) return null;
						const maxCount = monsterCounts.get(slot.monsterId) || 1;
						const doneCount = completedIds.filter(id => id === slot.monsterId).length;
						const completed = slot.slotIndex < doneCount;
						return (
							<button
								key={slot.key}
								className={`${styles.bossItem} ${completed ? styles.completed : ""}`}
								onClick={() => handleDuplicateSlotToggle(slot.monsterId, slot.slotIndex, maxCount)}
								title={`${getDifficultyLabel(monster.monsterDifficulty)} - ${monster.regionName || ""}`}
							>
								<span className={styles.bossCheckmark}>{completed && "✓"}</span>
								<span className={styles.bossName}>{monster.monsterName}</span>
								<span className={styles.bossRegion}>{getRegionText(monster)}</span>
 								<span className={styles.bossDifficulty}>{getDifficultyLabel(monster.monsterDifficulty)}</span>
							</button>
						);
					})}
				</div>
			</div>
		);
	}

	const displayMax = maxCompleted ?? (groupByName ? new Set(monsters.map(m => m.monsterName)).size : monsters.length);

	if(visualGroup && groups){
		return (
			<div className={styles.taskItem}>
				<div className={styles.taskLabelRow}>
					<span className={styles.taskLabel}>{label}</span>
					<span className={styles.counterText}>{completedIds.length}/{displayMax}</span>
				</div>
				<div className={styles.bossGrid}>
					{monsters.map(monster => {
						const completed = completedIds.includes(monster.monsterId);
						return (
							<button
								key={monster.monsterId}
								className={`${styles.bossItem} ${completed ? styles.completed : ""}`}
								onClick={() => handleToggle(monster.monsterId)}
								title={`${monster.regionName || ""}`}
							>
								<span className={styles.bossCheckmark}>{completed && "✓"}</span>
								<span className={styles.bossName}>{monster.monsterName}</span>
								<span className={styles.bossRegion}>{getRegionText(monster)}</span>
								<span className={styles.bossDifficulty}>{getDifficultyLabel(monster.monsterDifficulty)}</span>
							</button>
						);
					})}
				</div>
			</div>
		);
	}

	return (
		<div className={styles.taskItem}>
			<div className={styles.taskLabelRow}>
				<span className={styles.taskLabel}>{label}</span>
				<span className={styles.counterText}>{completedIds.length}/{displayMax}</span>
			</div>
			<div className={styles.bossGrid}>
				{monsters.map(monster => {
					const completed = completedIds.includes(monster.monsterId);
					return (
						<button
							key={monster.monsterId}
							className={`${styles.bossItem} ${completed ? styles.completed : ""}`}
							onClick={() => handleToggle(monster.monsterId)}
							title={`${getDifficultyLabel(monster.monsterDifficulty)} - ${monster.regionName || ""}`}
						>
							<span className={styles.bossCheckmark}>{completed && "✓"}</span>
							<span className={styles.bossName}>{monster.monsterName}</span>
							<span className={styles.bossRegion}>{getRegionText(monster)}</span>
							<span className={styles.bossDifficulty}>{getDifficultyLabel(monster.monsterDifficulty)}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};

export default BossChecklist;
