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
						key={i}
						className={`${styles.checkCircle} ${i < current ? styles.completed : ""}`}
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
