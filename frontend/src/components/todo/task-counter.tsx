import React from "react";
import styles from "./todo.module.scss";
import type {TaskCounterProps} from "@/types/ui";

const TaskCounter:React.FC<TaskCounterProps> = ({label, current, max, onChange}) => {
	return (
		<div className={styles.taskItem}>
			<div className={styles.taskLabelRow}>
				<span className={styles.taskLabel}>{label}</span>
				<span className={styles.counterText}>{current}/{max}</span>
			</div>
			<div className={styles.checkCircles}>
				{Array.from({length : max}, (_, i) => (
					<button
						type="button"
						key={i}
						className={`${styles.checkCircle} ${i < current ? styles.completed : ""}`}
						aria-pressed={i < current}
						onClick={() => {
							if(i < current){
								onChange(i);
							}else{
								onChange(i + 1);
							}
						}}
					/>
				))}
			</div>
		</div>
	);
};

export default TaskCounter;
