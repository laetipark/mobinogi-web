import React, {useState, useEffect} from "react";
import styles from "./todo.module.scss";
import type {CoinCounterProps} from "@/types/ui";

const CoinCounter:React.FC<CoinCounterProps> = ({
	label,
	current,
	max,
	chargeIntervalMinutes,
	lastChargeTime,
	onChange
}) => {
	const [displayCurrent, setDisplayCurrent] = useState(current);
	const [nextChargeIn, setNextChargeIn] = useState<string>("");
	
	useEffect(() => {
		if(!lastChargeTime || current >= max){
			setDisplayCurrent(current);
			setNextChargeIn("");
			return;
		}
		
		const calculateCharge = () => {
			const lastCharge = new Date(lastChargeTime).getTime();
			const now = Date.now();
			const elapsed = now - lastCharge;
			const chargeMs = chargeIntervalMinutes * 60 * 1000;
			const newCharges = Math.floor(elapsed / chargeMs);
			const computed = Math.min(current + newCharges, max);
			setDisplayCurrent(computed);
			
			if(computed < max){
				const nextChargeMs = chargeMs - (elapsed % chargeMs);
				const minutes = Math.floor(nextChargeMs / 60000);
				const seconds = Math.floor((nextChargeMs % 60000) / 1000);
				setNextChargeIn(`${minutes}:${seconds.toString().padStart(2, "0")}`);
			}else{
				setNextChargeIn("");
			}
		};
		
		calculateCharge();
		const interval = setInterval(calculateCharge, 1000);
		return () => clearInterval(interval);
	}, [current, max, chargeIntervalMinutes, lastChargeTime]);
	
	return (
		<div className={styles.taskItem}>
			<div className={styles.taskLabelRow}>
				<span className={styles.taskLabel}>{label}</span>
				{nextChargeIn && <span className={styles.timerText}>다음 충전: {nextChargeIn}</span>}
			</div>
			<div className={styles.checkCircles}>
				{Array.from({length : max}, (_, i) => (
					<button
						type="button"
						key={i}
						className={`${styles.checkCircle} ${i < displayCurrent ? styles.completed : ""}`}
						aria-pressed={i < displayCurrent}
						onClick={() => {
							if(i < displayCurrent){
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

export default CoinCounter;
