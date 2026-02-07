import React from "react";
import styles from "./todo.module.scss";

interface TaskCounterProps{
	label:string;
	current:number;
	max:number;
	onChange:(value:number) => void;
}

const TaskCounter:React.FC<TaskCounterProps> = ({label, current, max, onChange}) => {
	return (
		<div className={styles.taskItem}>
			<span className={styles.taskLabel}>{label}</span>
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
