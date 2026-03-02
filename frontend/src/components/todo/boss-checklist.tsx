import React, {useMemo} from "react";
import styles from "./todo.module.scss";
import {GameMonster} from "@/types";
import {getDifficultyLabel} from "@/utils";
import type {BossChecklistProps} from "@/types/ui";

type DuplicateMonsterGroup = {
	key:string;
	monsterName:string;
	difficultyLabel:string;
	regionText:string;
	slotIndices:number[];
};

type BossCardProps = {
	keyValue:string;
	monsterName:string;
	regionText:string;
	difficultyLabel:string;
	completedCount:number;
	maxCount:number;
	isStatic?:boolean;
	onSetCompletedCount:(nextCompletedCount:number) => void;
};

const normalizeDifficultyKey = (value:string):string => {
	return value.toLowerCase().replace(/\s+/g, "");
};

const getDifficultyToneClassName = (difficultyLabel:string):string => {
	const normalized = normalizeDifficultyKey(difficultyLabel);
	if(normalized.includes("veryhard") || normalized.includes("hell") || normalized.includes("매우어려움") || normalized.includes("지옥")){
		return styles.bossDifficultyExtreme;
	}
	if((normalized.includes("hard") || normalized.includes("어려움")) && !normalized.includes("veryhard") && !normalized.includes("매우어려움")){
		return styles.bossDifficultyHard;
	}
	if(normalized.includes("intro") || normalized.includes("beginner") || normalized.includes("입문")){
		return styles.bossDifficultyIntro;
	}
	return styles.bossDifficultyDefault;
};

const BossChecklist:React.FC<BossChecklistProps> = ({
	label,
	monsters,
	completedIds,
	onChange,
	maxCompleted,
	groupByName,
	allowDuplicates,
	trackedIds
}) => {
	const getRegionText = (monster:GameMonster):string => monster.regionName || "N/A";

	const handleToggle = (monsterId:number) => {
		const monster = monsters.find(m => m.monsterId === monsterId);
		if(completedIds.includes(monsterId)){
			onChange(completedIds.filter(id => id !== monsterId));
			return;
		}

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
	};

	const monsterById = useMemo(() => {
		return new Map(monsters.map(monster => [monster.monsterId, monster]));
	}, [monsters]);

	const duplicateGroups = useMemo<DuplicateMonsterGroup[]>(() => {
		if(!allowDuplicates || !trackedIds || trackedIds.length === 0){
			return [];
		}

		const groupMap = new Map<string, {
			monsterName:string;
			difficultyLabel:string;
			regionSet:Set<string>;
			slotIndices:number[];
		}>();

		trackedIds.forEach((monsterId, trackedIndex) => {
			const monster = monsterById.get(monsterId);
			if(!monster){
				return;
			}
			const key = `${monster.monsterName}__${monster.monsterDifficulty}`;
			let group = groupMap.get(key);
			if(!group){
				group = {
					monsterName : monster.monsterName,
					difficultyLabel : getDifficultyLabel(monster.monsterDifficulty),
					regionSet : new Set<string>(),
					slotIndices : []
				};
				groupMap.set(key, group);
			}
			group.slotIndices.push(trackedIndex);
			group.regionSet.add(getRegionText(monster));
		});

		return Array.from(groupMap.entries()).map(([key, group]) => ({
			key,
			monsterName : group.monsterName,
			difficultyLabel : group.difficultyLabel,
			regionText : Array.from(group.regionSet).join(" / "),
			slotIndices : group.slotIndices.sort((a, b) => a - b)
		}));
	}, [allowDuplicates, trackedIds, monsterById]);

	const handleDuplicateGroupToggle = (slotIndices:number[], nextCompletedCount:number, totalTracked:number) => {
		const normalizedSlots = [...slotIndices].sort((a, b) => a - b);
		const completedSet = new Set(completedIds.filter((idx) => idx >= 0 && idx < totalTracked));
		const currentGroupCompleted = normalizedSlots.reduce((count, slotIdx) => {
			return completedSet.has(slotIdx) ? count + 1 : count;
		}, 0);

		let targetCount = Math.max(0, Math.min(normalizedSlots.length, Math.floor(nextCompletedCount)));
		if(maxCompleted !== undefined){
			const completedOutsideGroup = completedSet.size - currentGroupCompleted;
			const allowedForGroup = Math.max(0, maxCompleted - completedOutsideGroup);
			targetCount = Math.min(targetCount, allowedForGroup);
		}

		normalizedSlots.forEach((slotIdx, order) => {
			if(order < targetCount){
				completedSet.add(slotIdx);
			}else{
				completedSet.delete(slotIdx);
			}
		});

		onChange(Array.from(completedSet).sort((a, b) => a - b));
	};

	const renderQtyButtons = (
		keyValue:string,
		monsterName:string,
		maxCount:number,
		completedCount:number,
		onSetCompletedCount:(nextCompletedCount:number) => void
	) => {
		return (
			<div className={styles.bossQtyRow}>
				<span className={styles.bossQtyLabel}>횟수</span>
				<div className={styles.bossQtyButtons}>
					{Array.from({length : maxCount}, (_, i) => {
						const checked = i < completedCount;
						const nextCompletedCount = checked ? i : i + 1;
						return (
							<button
								type="button"
								key={`${keyValue}-${i}`}
								className={`${styles.bossQtyButton} ${checked ? styles.completed : ""}`}
								aria-label={`${monsterName} ${i + 1}/${maxCount} ${checked ? "uncheck" : "check"}`}
								aria-pressed={checked}
								onClick={() => onSetCompletedCount(nextCompletedCount)}
							>
								<span className={styles.bossQtyIndex}>{checked ? "✓" : ""}</span>
							</button>
						);
					})}
				</div>
			</div>
		);
	};

	const renderBossCard = ({
		keyValue,
		monsterName,
		regionText,
		difficultyLabel,
		completedCount,
		maxCount,
		isStatic,
		onSetCompletedCount
	}:BossCardProps) => {
		const isCompleted = completedCount >= maxCount;
		const isPartial = completedCount > 0 && completedCount < maxCount;
		const difficultyToneClass = getDifficultyToneClassName(difficultyLabel);

		return (
			<div
				key={keyValue}
				className={`${styles.bossItem} ${isStatic ? styles.bossItemStatic : ""} ${isCompleted ? styles.completed : ""} ${isPartial ? styles.partial : ""}`}
				title={`${difficultyLabel} - ${regionText}`}
			>
				<div className={styles.bossItemHeader}>
					<div className={styles.bossItemTitleRow}>
						<span className={styles.bossName}>{monsterName}</span>
						<div className={styles.bossItemBadgeRow}>
							<span className={styles.bossRegionBadge}>{regionText}</span>
							<span className={`${styles.bossDifficultyBadge} ${difficultyToneClass}`}>{difficultyLabel}</span>
							<span className={styles.bossQtyBadge}>{completedCount}/{maxCount}</span>
						</div>
					</div>
				</div>
				{renderQtyButtons(keyValue, monsterName, maxCount, completedCount, onSetCompletedCount)}
			</div>
		);
	};

	if(monsters.length === 0){
		return (
			<div className={styles.taskItem}>
				<div className={styles.taskLabelRow}>
					<span className={styles.taskLabel}>{label}</span>
				</div>
				<div className={styles.emptyTracked}>설정에서 추적할 보스를 선택해 주세요.</div>
			</div>
		);
	}

	if(allowDuplicates && trackedIds){
		const totalTracked = trackedIds.length;
		const completedSet = new Set(completedIds.filter((idx) => idx >= 0 && idx < totalTracked));
		const totalCompleted = Math.min(completedSet.size, maxCompleted ?? totalTracked);

		return (
			<div className={styles.taskItem}>
				<div className={styles.taskLabelRow}>
					<span className={styles.taskLabel}>{label}</span>
					<span className={styles.counterText}>{totalCompleted}/{maxCompleted ?? totalTracked}</span>
				</div>
				<div className={styles.bossGrid}>
					{duplicateGroups.map(group => {
						const maxCount = group.slotIndices.length;
						const completedCount = group.slotIndices.reduce((count, slotIdx) => {
							return completedSet.has(slotIdx) ? count + 1 : count;
						}, 0);
						return renderBossCard({
							keyValue : group.key,
							monsterName : group.monsterName,
							regionText : group.regionText,
							difficultyLabel : group.difficultyLabel,
							completedCount,
							maxCount,
							isStatic : true,
							onSetCompletedCount : (nextCompletedCount) => {
								handleDuplicateGroupToggle(group.slotIndices, nextCompletedCount, totalTracked);
							}
						});
					})}
				</div>
			</div>
		);
	}

	const displayMax = maxCompleted ?? (groupByName ? new Set(monsters.map(m => m.monsterName)).size : monsters.length);
	const displayCompletedCount = Math.min(completedIds.length, displayMax);

	return (
		<div className={styles.taskItem}>
			<div className={styles.taskLabelRow}>
				<span className={styles.taskLabel}>{label}</span>
				<span className={styles.counterText}>{displayCompletedCount}/{displayMax}</span>
			</div>
			<div className={styles.bossGrid}>
				{monsters.map(monster => {
					const completed = completedIds.includes(monster.monsterId);
					const difficultyLabel = getDifficultyLabel(monster.monsterDifficulty);
					return renderBossCard({
						keyValue : `${monster.monsterId}`,
						monsterName : monster.monsterName,
						regionText : getRegionText(monster),
						difficultyLabel,
						completedCount : completed ? 1 : 0,
						maxCount : 1,
						onSetCompletedCount : (nextCompletedCount) => {
							const shouldComplete = nextCompletedCount > 0;
							if(shouldComplete !== completed){
								handleToggle(monster.monsterId);
							}
						}
					});
				})}
			</div>
		</div>
	);
};

export default BossChecklist;
