import React, {useMemo, useState} from "react";
import styles from "./todo.module.scss";
import {GameMonster} from "@/types";
import {getDifficultyLabel} from "@/utils";
import type {BossSettingsModalProps} from "@/types/ui";

type MonsterGroup = {
	name:string;
	monsters:GameMonster[];
	regionText:string;
};

/**
 * Utility function normalizeDifficultyKey.
 */
const normalizeDifficultyKey = (value:string):string => value.toLowerCase().replace(/\s+/g, "");

/**
 * Utility function getDifficultyToneClassName.
 */
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

/**
 * Utility function getDifficultyOrder.
 */
const getDifficultyOrder = (monster:GameMonster):number => {
	const parsed = Number(monster.monsterDifficulty);
	return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

/**
 * Utility function buildMonsterGroups.
 */
const buildMonsterGroups = (monsters:GameMonster[]):MonsterGroup[] => {
	const groupMap = new Map<string, GameMonster[]>();
	const nameOrder:string[] = [];
	for(const monster of monsters){
		const grouped = groupMap.get(monster.monsterName);
		if(grouped){
			grouped.push(monster);
		}else{
			groupMap.set(monster.monsterName, [monster]);
			nameOrder.push(monster.monsterName);
		}
	}
	return nameOrder.map((name) => {
		const grouped = [...(groupMap.get(name) || [])].sort((a, b) => {
			const difficultyDiff = getDifficultyOrder(a) - getDifficultyOrder(b);
			if(difficultyDiff !== 0){
				return difficultyDiff;
			}
			return a.monsterId - b.monsterId;
		});
		const regionText = [...new Set(grouped.map((monster) => monster.regionName).filter(Boolean))].join(" / ");
		return {
			name,
			monsters : grouped,
			regionText
		};
	});
};

const BossSettingsModal:React.FC<BossSettingsModalProps> = ({
	title,
	monsters,
	trackedIds,
	exclusiveByName,
	maxSelections,
	allowMultiple,
	groupByName,
	showBulkActions = true,
	rewardMax,
	onRewardMaxChange,
	onSave,
	onClose
}) => {
	const [selected, setSelected] = useState<number[]>([...trackedIds]);
	const [localRewardMax, setLocalRewardMax] = useState(rewardMax ?? 4);
	const [focusedDifficultyByName, setFocusedDifficultyByName] = useState<Record<string, number>>({});

	const groupedMonsters = useMemo(() => buildMonsterGroups(monsters), [monsters]);
	const atLimit = maxSelections !== undefined && selected.length >= maxSelections;

	/**
	 * Utility function getGroupMonsterIds.
	 */
	const getGroupMonsterIds = (group:MonsterGroup):number[] => group.monsters.map((monster) => monster.monsterId);
	/**
	 * Utility function resolveFocusedIndex.
	 */
	const resolveFocusedIndex = (group:MonsterGroup):number => {
		const focusedIndex = focusedDifficultyByName[group.name];
		if(focusedIndex !== undefined && focusedIndex >= 0 && focusedIndex < group.monsters.length){
			return focusedIndex;
		}
		const selectedIndex = group.monsters.findIndex((monster) => selected.includes(monster.monsterId));
		return selectedIndex >= 0 ? selectedIndex : 0;
	};
	/**
	 * Utility function getFocusedMonster.
	 */
	const getFocusedMonster = (group:MonsterGroup):GameMonster | undefined => {
		return group.monsters[resolveFocusedIndex(group)];
	};
	/**
	 * Utility function isGroupSelected.
	 */
	const isGroupSelected = (group:MonsterGroup):boolean => {
		const groupMonsterIds = getGroupMonsterIds(group);
		return selected.some((monsterId) => groupMonsterIds.includes(monsterId));
	};

	/**
	 * Utility function handleToggle.
	 */
	const handleToggle = (monsterId:number) => {
		setSelected((prev) => {
			if(prev.includes(monsterId)){
				return prev.filter((id) => id !== monsterId);
			}
			if(maxSelections !== undefined && prev.length >= maxSelections){
				return prev;
			}
			return [...prev, monsterId];
		});
	};

	/**
	 * Utility function handleGroupToggleSelection.
	 */
	const handleGroupToggleSelection = (group:MonsterGroup) => {
		const focusedMonster = getFocusedMonster(group);
		if(!focusedMonster){
			return;
		}
		const groupMonsterIds = getGroupMonsterIds(group);
		setSelected((prev) => {
			const selectedInGroup = prev.some((monsterId) => groupMonsterIds.includes(monsterId));
			if(selectedInGroup){
				return prev.filter((monsterId) => !groupMonsterIds.includes(monsterId));
			}
			if(maxSelections !== undefined && prev.length >= maxSelections){
				return prev;
			}
			return [...prev.filter((monsterId) => !groupMonsterIds.includes(monsterId)), focusedMonster.monsterId];
		});
	};

	/**
	 * Utility function handleGroupDifficultyShift.
	 */
	const handleGroupDifficultyShift = (group:MonsterGroup, delta:number) => {
		if(group.monsters.length <= 1){
			return;
		}
		const currentIndex = resolveFocusedIndex(group);
		/**
		 * Utility function nextIndex.
		 */
		const nextIndex = (currentIndex + delta + group.monsters.length) % group.monsters.length;
		const nextMonster = group.monsters[nextIndex];
		if(!nextMonster){
			return;
		}
		setFocusedDifficultyByName((prev) => ({
			...prev,
			[group.name] : nextIndex
		}));
		const groupMonsterIds = getGroupMonsterIds(group);
		setSelected((prev) => {
			const selectedInGroup = prev.some((monsterId) => groupMonsterIds.includes(monsterId));
			if(!selectedInGroup){
				return prev;
			}
			return [...prev.filter((monsterId) => !groupMonsterIds.includes(monsterId)), nextMonster.monsterId];
		});
	};

	/**
	 * Utility function handleSelectAll.
	 */
	const handleSelectAll = () => {
		if(exclusiveByName || groupByName){
			const next:number[] = [];
			for(const group of groupedMonsters){
				const groupMonsterIds = getGroupMonsterIds(group);
				const selectedMonsterId = selected.find((monsterId) => groupMonsterIds.includes(monsterId));
				const focusedMonsterId = getFocusedMonster(group)?.monsterId;
				const targetMonsterId = selectedMonsterId ?? focusedMonsterId;
				if(targetMonsterId === undefined){
					continue;
				}
				next.push(targetMonsterId);
				if(maxSelections !== undefined && next.length >= maxSelections){
					break;
				}
			}
			setSelected(next);
			return;
		}
		if(maxSelections !== undefined){
			setSelected(monsters.slice(0, maxSelections).map((monster) => monster.monsterId));
			return;
		}
		setSelected(monsters.map((monster) => monster.monsterId));
	};

	/**
	 * Utility function handleDeselectAll.
	 */
	const handleDeselectAll = () => {
		setSelected([]);
	};

	/**
	 * Utility function handleAddOne.
	 */
	const handleAddOne = (monsterId:number) => {
		setSelected((prev) => {
			if(rewardMax !== undefined && prev.length >= localRewardMax){
				return prev;
			}
			return [...prev, monsterId];
		});
	};

	/**
	 * Utility function handleRemoveOne.
	 */
	const handleRemoveOne = (monsterId:number) => {
		setSelected((prev) => {
			const removeIndex = prev.lastIndexOf(monsterId);
			if(removeIndex === -1){
				return prev;
			}
			return [...prev.slice(0, removeIndex), ...prev.slice(removeIndex + 1)];
		});
	};

	/**
	 * Utility function handleRewardMaxChange.
	 */
	const handleRewardMaxChange = (newMax:number) => {
		setLocalRewardMax(newMax);
		setSelected((prev) => (prev.length > newMax ? prev.slice(0, newMax) : prev));
	};

	/**
	 * Utility function handleSave.
	 */
	const handleSave = () => {
		if(onRewardMaxChange){
			onRewardMaxChange(localRewardMax);
		}
		onSave(selected);
	};

	/**
	 * Utility function buildPreviewMap.
	 */
	const buildPreviewMap = () => {
		const previewMap = new Map<number, number>();
		for(const monsterId of selected){
			previewMap.set(monsterId, (previewMap.get(monsterId) || 0) + 1);
		}
		return previewMap;
	};

	/**
	 * Utility function renderDifficultyAdjust.
	 */
	const renderDifficultyAdjust = (group:MonsterGroup) => {
		const focusedMonster = getFocusedMonster(group);
		if(!focusedMonster){
			return null;
		}
		const canShift = group.monsters.length > 1;
		const difficultyLabel = getDifficultyLabel(focusedMonster.monsterDifficulty);
		const difficultyToneClass = getDifficultyToneClassName(difficultyLabel);
		return (
			<div className={styles.difficultyAdjust}>
				<button
					type="button"
					className={styles.difficultyArrowBtn}
					onClick={() => handleGroupDifficultyShift(group, -1)}
					disabled={!canShift}
					aria-label={`${group.name} 난이도 이전`}
				>
					&lt;
				</button>
				<div className={styles.difficultyBadgeWrap}>
					<span className={`${styles.bossDifficultyBadge} ${difficultyToneClass}`}>{difficultyLabel}</span>
				</div>
				<button
					type="button"
					className={styles.difficultyArrowBtn}
					onClick={() => handleGroupDifficultyShift(group, 1)}
					disabled={!canShift}
					aria-label={`${group.name} 난이도 다음`}
				>
					&gt;
				</button>
			</div>
		);
	};

	/**
	 * Utility function renderAllowMultiple.
	 */
	const renderAllowMultiple = () => {
		const full = rewardMax !== undefined && selected.length >= localRewardMax;
		return groupedMonsters.map((group) => {
			const focusedMonster = getFocusedMonster(group);
			if(!focusedMonster){
				return null;
			}
			return (
				<div key={group.name} className={styles.monsterGroup}>
					<div className={styles.monsterGroupMeta}>
						<span className={styles.monsterGroupName}>{group.name}</span>
						{group.regionText ? <span className={styles.monsterGroupRegion}>{group.regionText}</span> : null}
					</div>
					<div className={styles.monsterGroupControl}>
						{renderDifficultyAdjust(group)}
						<button
							type="button"
							className={styles.abyssAddBtn}
							onClick={() => handleAddOne(focusedMonster.monsterId)}
							disabled={full}
						>
							추가 +
						</button>
					</div>
				</div>
			);
		});
	};

	/**
	 * Utility function renderGroupedDifficultySelector.
	 */
	const renderGroupedDifficultySelector = () => {
		return groupedMonsters.map((group) => {
			const selectedInGroup = isGroupSelected(group);
			const disabled = !selectedInGroup && atLimit;
			return (
				<div key={group.name} className={styles.monsterGroup}>
					<div className={styles.monsterGroupMeta}>
						<span className={styles.monsterGroupName}>{group.name}</span>
						{group.regionText ? <span className={styles.monsterGroupRegion}>{group.regionText}</span> : null}
					</div>
					<div className={styles.monsterGroupControl}>
						{renderDifficultyAdjust(group)}
						<button
							type="button"
							className={styles.groupSelectBtn}
							onClick={() => handleGroupToggleSelection(group)}
							disabled={disabled}
						>
							{selectedInGroup ? "해제" : "선택"}
						</button>
					</div>
				</div>
			);
		});
	};

	/**
	 * Utility function renderFlat.
	 */
	const renderFlat = () => {
		return monsters.map((monster) => {
			const isSelected = selected.includes(monster.monsterId);
			const disabled = !isSelected && atLimit;
			return (
				<label key={monster.monsterId} className={`${styles.monsterOption} ${disabled ? styles.disabled : ""}`}>
					<input
						type="checkbox"
						checked={isSelected}
						onChange={() => !disabled && handleToggle(monster.monsterId)}
						disabled={disabled}
					/>
					<span className={styles.monsterOptionName}>{monster.monsterName}</span>
					<span className={styles.monsterOptionDetail}>{getDifficultyLabel(monster.monsterDifficulty)}</span>
				</label>
			);
		});
	};

	const totalSelected = selected.length;

	return (
		<div className={styles.modalOverlay} onClick={onClose}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<div className={styles.modalHeader}>
					<h3>{title} 설정</h3>
					<button className={styles.modalClose} onClick={onClose}>&times;</button>
				</div>
				<div className={styles.modalBody}>
					{rewardMax !== undefined && (
						<div className={styles.rewardMaxRow}>
							<span className={styles.rewardMaxLabel}>주간 보상 최대 횟수</span>
							<div className={styles.counterControl}>
								<button
									type="button"
									className={styles.counterBtn}
									onClick={() => handleRewardMaxChange(Math.max(1, localRewardMax - 1))}
									disabled={localRewardMax <= 1}
								>
									&minus;
								</button>
								<span className={styles.counterValue}>{localRewardMax}</span>
								<button
									type="button"
									className={styles.counterBtn}
									onClick={() => handleRewardMaxChange(localRewardMax + 1)}
								>
									+
								</button>
							</div>
						</div>
					)}
					{!allowMultiple && (
						<div className={styles.modalActions}>
							{showBulkActions && (
								<>
									<button type="button" className={styles.modalActionBtn} onClick={handleSelectAll}>전체 선택</button>
									<button type="button" className={styles.modalActionBtn} onClick={handleDeselectAll}>전체 해제</button>
								</>
							)}
							<span className={styles.modalCount}>
								{totalSelected}개 선택{maxSelections !== undefined && ` (최대 ${maxSelections})`}
							</span>
						</div>
					)}
					{allowMultiple && (
						<div className={styles.modalActions}>
							<button type="button" className={styles.modalActionBtn} onClick={handleDeselectAll}>전체 해제</button>
							<span className={styles.modalCount}>{totalSelected}개 선택</span>
						</div>
					)}
					<div className={styles.monsterList}>
						{allowMultiple
							? renderAllowMultiple()
							: (exclusiveByName || groupByName)
								? renderGroupedDifficultySelector()
								: renderFlat()}
					</div>
				</div>
				{allowMultiple && selected.length > 0 && (
					<div className={styles.abyssPreview}>
						<div className={styles.abyssPreviewGrid}>
							{[...buildPreviewMap().entries()].map(([monsterId, count]) => {
								const monster = monsters.find((currentMonster) => currentMonster.monsterId === monsterId);
								if(!monster){
									return null;
								}
								return (
									<div key={monsterId} className={styles.abyssPreviewCard}>
										<div className={styles.abyssPreviewInfo}>
											<span className={styles.abyssPreviewName}>{monster.monsterName}</span>
											{monster.regionName && <span className={styles.abyssPreviewRegion}>{monster.regionName}</span>}
											<span className={styles.abyssPreviewDiff}>{getDifficultyLabel(monster.monsterDifficulty)} &times;{count}</span>
										</div>
										<button
											type="button"
											className={styles.abyssPreviewRemove}
											onClick={() => handleRemoveOne(monsterId)}
										>
											&times;
										</button>
									</div>
								);
							})}
						</div>
					</div>
				)}
				<div className={styles.modalFooter}>
					<button className={styles.modalCancelBtn} onClick={onClose}>취소</button>
					<button className={styles.modalSaveBtn} onClick={handleSave}>확인</button>
				</div>
			</div>
		</div>
	);
};

export default BossSettingsModal;
