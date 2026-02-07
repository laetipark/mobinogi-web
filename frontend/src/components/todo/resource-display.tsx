import React, {useState, useEffect} from "react";
import styles from "./todo.module.scss";
import {Resources, CounterTask} from "../../types";

interface ResourceDisplayProps{
	resources:Resources;
	onChange:(resources:Resources) => void;
}

interface ResourceItemProps{
	label:string;
	max:number;
	chargeIntervalMinutes:number;
	value?:CounterTask;
	onChange:(value:CounterTask) => void;
}

const ResourceItem:React.FC<ResourceItemProps> = ({label, max, chargeIntervalMinutes, value, onChange}) => {
	const [fullChargeText, setFullChargeText] = useState("");
	const current = value?.current ?? 0;

	useEffect(() => {
		if(current <= 0 || current >= max){
			setFullChargeText("");
			return;
		}

		const remaining = max - current;
		const totalMinutes = remaining * chargeIntervalMinutes;

		const updateText = () => {
			if(value?.lastChargeTime){
				const lastCharge = new Date(value.lastChargeTime).getTime();
				const now = Date.now();
				const elapsed = now - lastCharge;
				const chargeMs = chargeIntervalMinutes * 60 * 1000;
				const nextChargeMs = chargeMs - (elapsed % chargeMs);
				const remainingCharges = remaining - 1;
				const totalMs = nextChargeMs + remainingCharges * chargeMs;

				const hours = Math.floor(totalMs / 3600000);
				const minutes = Math.floor((totalMs % 3600000) / 60000);
				setFullChargeText(`만충 ${hours}시간 ${minutes}분`);
			}else{
				const hours = Math.floor(totalMinutes / 60);
				const mins = totalMinutes % 60;
				setFullChargeText(`만충 ${hours}시간 ${mins}분`);
			}
		};

		updateText();
		const interval = setInterval(updateText, 60000);
		return () => clearInterval(interval);
	}, [current, max, chargeIntervalMinutes, value?.lastChargeTime]);

	const handleChange = (e:React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		if(val === ""){
			onChange({current : 0, lastChargeTime : new Date().toISOString()});
			return;
		}
		const num = parseInt(val, 10);
		if(!isNaN(num) && num >= 0 && num <= max){
			onChange({current : num, lastChargeTime : new Date().toISOString()});
		}
	};

	return (
		<div className={styles.resourceItem}>
			<span className={styles.resourceLabel}>{label}</span>
			<div className={styles.resourceInputRow}>
				<input
					type="number"
					className={styles.resourceInput}
					value={current || ""}
					min={0}
					max={max}
					placeholder="0"
					onChange={handleChange}
				/>
				<span className={styles.resourceMax}>/ {max}</span>
			</div>
			{fullChargeText && (
				<span className={styles.resourceTimer}>{fullChargeText}</span>
			)}
		</div>
	);
};

const ResourceDisplay:React.FC<ResourceDisplayProps> = ({resources, onChange}) => {
	return (
		<div className={styles.resourceSection}>
			<ResourceItem
				label="은동전"
				max={100}
				chargeIntervalMinutes={30}
				value={resources.silverCoin}
				onChange={(val) => onChange({...resources, silverCoin : val})}
			/>
			<ResourceItem
				label="마족 공물"
				max={10}
				chargeIntervalMinutes={720}
				value={resources.demonTribute}
				onChange={(val) => onChange({...resources, demonTribute : val})}
			/>
		</div>
	);
};

export default ResourceDisplay;
