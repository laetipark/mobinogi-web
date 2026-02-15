import React, {useState, useRef, useEffect} from "react";
import styles from "./todo.module.scss";
import type {PhantomTowerSelectorProps} from "@/types/ui";

const MAX_FLOOR = 30;
const MAX_STAGE = 5;

const PhantomTowerSelector:React.FC<PhantomTowerSelectorProps> = ({value, onChange}) => {
	const [editingFloor, setEditingFloor] = useState(false);
	const [editingStage, setEditingStage] = useState(false);
	const [floorInput, setFloorInput] = useState(value.floor.toString());
	const [stageInput, setStageInput] = useState(value.stage.toString());
	const floorRef = useRef<HTMLInputElement>(null);
	const stageRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if(editingFloor && floorRef.current){
			floorRef.current.focus();
			floorRef.current.select();
		}
	}, [editingFloor]);

	useEffect(() => {
		if(editingStage && stageRef.current){
			stageRef.current.focus();
			stageRef.current.select();
		}
	}, [editingStage]);

	const handleUp = () => {
		if(value.stage < MAX_STAGE){
			onChange({...value, stage : value.stage + 1});
		}else if(value.floor < MAX_FLOOR){
			onChange({floor : value.floor + 1, stage : 1});
		}
	};

	const handleDown = () => {
		if(value.stage > 1){
			onChange({...value, stage : value.stage - 1});
		}else if(value.floor > 1){
			onChange({floor : value.floor - 1, stage : MAX_STAGE});
		}
	};

	const commitFloor = () => {
		const num = parseInt(floorInput, 10);
		if(!isNaN(num) && num >= 1 && num <= MAX_FLOOR){
			onChange({...value, floor : num});
		}
		setEditingFloor(false);
	};

	const commitStage = () => {
		const num = parseInt(stageInput, 10);
		if(!isNaN(num) && num >= 1 && num <= MAX_STAGE){
			onChange({...value, stage : num});
		}
		setEditingStage(false);
	};

	const handleFloorKey = (e:React.KeyboardEvent) => {
		if(e.key === "Enter") commitFloor();
		if(e.key === "Escape") setEditingFloor(false);
	};

	const handleStageKey = (e:React.KeyboardEvent) => {
		if(e.key === "Enter") commitStage();
		if(e.key === "Escape") setEditingStage(false);
	};

	const isMin = value.floor === 1 && value.stage === 1;
	const isMax = value.floor === MAX_FLOOR && value.stage === MAX_STAGE;

	return (
		<div className={styles.taskItem}>
			<div className={styles.taskLabelRow}>
				<span className={styles.taskLabel}>망각의 탑</span>
				<div className={styles.phantomControls}>
					<span className={styles.phantomValue}>
						{editingFloor ? (
							<input
								ref={floorRef}
								type="number"
								className={styles.phantomInput}
								value={floorInput}
								min={1}
								max={MAX_FLOOR}
								onChange={(e) => setFloorInput(e.target.value)}
								onBlur={commitFloor}
								onKeyDown={handleFloorKey}
							/>
						) : (
							<span
								className={styles.phantomEditable}
								onDoubleClick={() => {
									setFloorInput(value.floor.toString());
									setEditingFloor(true);
								}}
								title="더블클릭으로 편집"
							>
								{value.floor}
							</span>
						)}
						<span>층 </span>
						{editingStage ? (
							<input
								ref={stageRef}
								type="number"
								className={styles.phantomInput}
								value={stageInput}
								min={1}
								max={MAX_STAGE}
								onChange={(e) => setStageInput(e.target.value)}
								onBlur={commitStage}
								onKeyDown={handleStageKey}
							/>
						) : (
							<span
								className={styles.phantomEditable}
								onDoubleClick={() => {
									setStageInput(value.stage.toString());
									setEditingStage(true);
								}}
								title="더블클릭으로 편집"
							>
								{value.stage}
							</span>
						)}
						<span>단계</span>
					</span>
					<button
						className={styles.phantomBtn}
						onClick={handleDown}
						disabled={isMin}
					>
						&#9660;
					</button>
					<button
						className={styles.phantomBtn}
						onClick={handleUp}
						disabled={isMax}
					>
						&#9650;
					</button>
				</div>
			</div>
		</div>
	);
};

export default PhantomTowerSelector;
