import React from "react";
import styles from "./todo.module.scss";
import {GameMonster} from "../../types";

interface BossChecklistProps{
	label:string;
	monsters:GameMonster[];
	completedIds:number[];
	onChange:(completedIds:number[]) => void;
}

const BossChecklist:React.FC<BossChecklistProps> = ({label, monsters, completedIds, onChange}) => {
	const handleToggle = (monsterId:number) => {
		if(completedIds.includes(monsterId)){
			onChange(completedIds.filter(id => id !== monsterId));
		}else{
			onChange([...completedIds, monsterId]);
		}
	};

	if(monsters.length === 0){
		return (
			<div className={styles.taskItem}>
				<div className={styles.taskLabelRow}>
					<span className={styles.taskLabel}>{label}</span>
				</div>
				<div className={styles.emptyTracked}>설정에서 추적할 항목을 선택하세요</div>
			</div>
		);
	}

	return (
		<div className={styles.taskItem}>
			<div className={styles.taskLabelRow}>
				<span className={styles.taskLabel}>{label}</span>
				<span className={styles.counterText}>{completedIds.length}/{monsters.length}</span>
			</div>
			<div className={styles.bossGrid}>
				{monsters.map(monster => (
					<button
						key={monster.monsterId}
						className={`${styles.bossItem} ${completedIds.includes(monster.monsterId) ? styles.completed : ""}`}
						onClick={() => handleToggle(monster.monsterId)}
						title={`${monster.monsterDifficulty} - ${monster.regionName || ""}`}
					>
						<span className={styles.bossName}>{monster.monsterName}</span>
						<span className={styles.bossDifficulty}>{monster.monsterDifficulty}</span>
					</button>
				))}
			</div>
		</div>
	);
};

export default BossChecklist;
