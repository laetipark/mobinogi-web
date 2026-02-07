import React from "react";
import styles from "./todo.module.scss";
import {DailyTasks} from "../../types";

interface DailyTaskSectionProps{
	daily:DailyTasks;
	onChange:(daily:DailyTasks) => void;
}

const DailyTaskSection:React.FC<DailyTaskSectionProps> = ({daily, onChange}) => {
	const completedCount = daily.dayDungeon ? 1 : 0;

	return (
		<div className={styles.taskSection}>
			<div className={styles.sectionHeader}>
				<h4>일일 숙제</h4>
				<span className={styles.progressText}>{completedCount}/1</span>
			</div>
			<div className={styles.progressBar}>
				<div className={styles.progressFill} style={{width : `${completedCount * 100}%`}}/>
			</div>

			<div className={styles.taskList}>
				<div className={styles.taskItem}>
					<span className={styles.taskLabel}>요일 던전</span>
					<div className={styles.checkCircles}>
						<button
							className={`${styles.checkCircle} ${daily.dayDungeon ? styles.completed : ""}`}
							onClick={() => onChange({...daily, dayDungeon : !daily.dayDungeon})}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DailyTaskSection;
