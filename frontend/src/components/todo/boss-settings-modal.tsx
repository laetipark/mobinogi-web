import React, {useState} from "react";
import styles from "./todo.module.scss";
import {GameMonster} from "@/types";
import {getDifficultyLabel} from "@/utils";
import type {BossSettingsModalProps} from "@/types/ui";

const BossSettingsModal:React.FC<BossSettingsModalProps> = ({
	title,
	monsters,
	trackedIds,
	exclusiveByName,
	maxSelections,
	allowMultiple,
	groupByName,
	rewardMax,
	onRewardMaxChange,
	onSave,
	onClose
}) => {
	const [selected, setSelected] = useState<number[]>([...trackedIds]);
	const [localRewardMax, setLocalRewardMax] = useState(rewardMax ?? 4);
	
	const atLimit = maxSelections !== undefined && selected.length >= maxSelections;
	
	const handleToggle = (monsterId:number) => {
		setSelected(prev => {
			if(prev.includes(monsterId)){
				return prev.filter(id => id !== monsterId);
			}
			if(exclusiveByName){
				const monster = monsters.find(m => m.monsterId === monsterId);
				if(monster){
					const sameNameIds = monsters.filter(m => m.monsterName === monster.monsterName).map(m => m.monsterId);
					const filtered = prev.filter(id => !sameNameIds.includes(id));
					if(maxSelections !== undefined && filtered.length >= maxSelections) return prev;
					return [...filtered, monsterId];
				}
			}
			if(maxSelections !== undefined && prev.length >= maxSelections) return prev;
			return [...prev, monsterId];
		});
	};
	
	const handleSelectAll = () => {
		if(exclusiveByName){
			const seen = new Set<string>();
			const result:number[] = [];
			for(const m of monsters){
				if(!seen.has(m.monsterName)){
					seen.add(m.monsterName);
					const existing = selected.find(id => monsters.find(mm => mm.monsterId === id && mm.monsterName === m.monsterName));
					result.push(existing ?? m.monsterId);
					if(maxSelections !== undefined && result.length >= maxSelections) break;
				}
			}
			setSelected(result);
		}else if(maxSelections !== undefined){
			setSelected(monsters.slice(0, maxSelections).map(m => m.monsterId));
		}else{
			setSelected(monsters.map(m => m.monsterId));
		}
	};
	
	const handleDeselectAll = () => {
		setSelected([]);
	};
	
	const handleAddOne = (monsterId:number) => {
		setSelected(prev => {
			if(rewardMax !== undefined && prev.length >= localRewardMax) return prev;
			return [...prev, monsterId];
		});
	};
	
	const handleRemoveOne = (monsterId:number) => {
		setSelected(prev => {
			const idx = prev.lastIndexOf(monsterId);
			if(idx === -1) return prev;
			return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
		});
	};
	
	const handleRewardMaxChange = (newMax:number) => {
		setLocalRewardMax(newMax);
		setSelected(prev => prev.length > newMax ? prev.slice(0, newMax) : prev);
	};
	
	const handleSave = () => {
		if(onRewardMaxChange){
			onRewardMaxChange(localRewardMax);
		}
		onSave(selected);
	};
	
	const buildGroups = () => {
		const groups:{name:string; monsters:GameMonster[]}[] = [];
		for(const m of monsters){
			const last = groups[groups.length - 1];
			if(last && last.name === m.monsterName){
				last.monsters.push(m);
			}else{
				groups.push({name : m.monsterName, monsters : [m]});
			}
		}
		return groups;
	};
	
	const renderAllowMultiple = () => {
		const groups = buildGroups();
		const full = rewardMax !== undefined && selected.length >= localRewardMax;
		
		return groups.map(group => (
			<div key={group.name} className={styles.monsterGroup}>
				<div className={styles.monsterGroupMeta}>
					<span className={styles.monsterGroupName}>{group.name}</span>
					{(() => {
						const regionText = [...new Set(group.monsters.map(m => m.regionName).filter(Boolean))].join(" / ");
						return regionText ? <span className={styles.monsterGroupRegion}>{regionText}</span> : null;
					})()}
				</div>
				<div className={styles.monsterGroupOptions}>
					{group.monsters.map(monster => (
						<button
							key={monster.monsterId}
							className={styles.abyssAddBtn}
							onClick={() => handleAddOne(monster.monsterId)}
							disabled={full}
						>
							{getDifficultyLabel(monster.monsterDifficulty)} +
						</button>
					))}
				</div>
			</div>
		));
	};
	
	const buildPreviewMap = () => {
		const map = new Map<number, number>();
		for(const id of selected){
			map.set(id, (map.get(id) || 0) + 1);
		}
		return map;
	};
	
	const renderGroupByName = () => {
		const groups = buildGroups();
		return groups.map(group => (
			<div key={group.name} className={styles.monsterGroup}>
				<span className={styles.monsterGroupName}>{group.name}</span>
				<div className={styles.monsterGroupOptions}>
					{group.monsters.map(monster => {
						const isSelected = selected.includes(monster.monsterId);
						const disabled = !isSelected && atLimit;
						return (
							<label key={monster.monsterId}
								   className={`${styles.monsterOption} ${disabled ? styles.disabled : ""}`}>
								<input
									type="checkbox"
									checked={isSelected}
									onChange={() => !disabled && handleToggle(monster.monsterId)}
									disabled={disabled}
								/>
								<span
									className={styles.monsterOptionDetail}>{getDifficultyLabel(monster.monsterDifficulty)}</span>
							</label>
						);
					})}
				</div>
			</div>
		));
	};
	
	const renderExclusiveByName = () => {
		const groups = buildGroups();
		return groups.map(group => (
			<div key={group.name} className={styles.monsterGroup}>
				<span className={styles.monsterGroupName}>{group.name}</span>
				<div className={styles.monsterGroupOptions}>
					{group.monsters.map(monster => {
						const isSelected = selected.includes(monster.monsterId);
						const groupHasSelection = group.monsters.some(m => selected.includes(m.monsterId));
						const disabled = !isSelected && !groupHasSelection && atLimit;
						return (
							<label key={monster.monsterId}
								   className={`${styles.monsterOption} ${disabled ? styles.disabled : ""}`}>
								<input
									type="radio"
									name={`boss_${group.name}`}
									checked={isSelected}
									onChange={() => !disabled && handleToggle(monster.monsterId)}
									disabled={disabled}
								/>
								<span
									className={styles.monsterOptionDetail}>{getDifficultyLabel(monster.monsterDifficulty)}</span>
							</label>
						);
					})}
					<label className={styles.monsterOption}>
						<input
							type="radio"
							name={`boss_${group.name}`}
							checked={!group.monsters.some(m => selected.includes(m.monsterId))}
							onChange={() => {
								const ids = group.monsters.map(m => m.monsterId);
								setSelected(prev => prev.filter(id => !ids.includes(id)));
							}}
						/>
						<span className={styles.monsterOptionDetail}>선택 안함</span>
					</label>
				</div>
			</div>
		));
	};
	
	const renderFlat = () => {
		return monsters.map(monster => {
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
	
	const totalSelected = allowMultiple ? selected.length : selected.length;
	
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
								<button className={styles.counterBtn}
										onClick={() => handleRewardMaxChange(Math.max(1, localRewardMax - 1))}
										disabled={localRewardMax <= 1}>&minus;</button>
								<span className={styles.counterValue}>{localRewardMax}</span>
								<button className={styles.counterBtn}
										onClick={() => handleRewardMaxChange(localRewardMax + 1)}>+
								</button>
							</div>
						</div>
					)}
					{!allowMultiple && (
						<div className={styles.modalActions}>
							<button className={styles.modalActionBtn} onClick={handleSelectAll}>전체 선택</button>
							<button className={styles.modalActionBtn} onClick={handleDeselectAll}>전체 해제</button>
							<span className={styles.modalCount}>
								{totalSelected}개 선택{maxSelections !== undefined && ` (최대 ${maxSelections})`}
							</span>
						</div>
					)}
					{allowMultiple && (
						<div className={styles.modalActions}>
							<button className={styles.modalActionBtn} onClick={handleDeselectAll}>전체 해제</button>
							<span className={styles.modalCount}>{totalSelected}개 선택</span>
						</div>
					)}
					<div className={styles.monsterList}>
						{allowMultiple ? renderAllowMultiple()
							: exclusiveByName ? renderExclusiveByName()
								: groupByName ? renderGroupByName()
									: renderFlat()}
					</div>
				</div>
				{allowMultiple && selected.length > 0 && (
					<div className={styles.abyssPreview}>
						<div className={styles.abyssPreviewGrid}>
							{[...buildPreviewMap().entries()].map(([monsterId, count]) => {
								const monster = monsters.find(m => m.monsterId === monsterId);
								if(!monster) return null;
								return (
									<div key={monsterId} className={styles.abyssPreviewCard}>
										<div className={styles.abyssPreviewInfo}>
											<span className={styles.abyssPreviewName}>{monster.monsterName}</span>
											{monster.regionName &&
												<span className={styles.abyssPreviewRegion}>{monster.regionName}</span>}
											<span
												className={styles.abyssPreviewDiff}>{getDifficultyLabel(monster.monsterDifficulty)} &times;{count}</span>
										</div>
										<button className={styles.abyssPreviewRemove}
												onClick={() => handleRemoveOne(monsterId)}>&times;</button>
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
