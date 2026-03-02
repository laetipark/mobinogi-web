import React, {useEffect, useMemo, useState} from "react";
import styles from "./todo.module.scss";
import {UserTodoBarter} from "@/types";
import {todoService} from "@/services/todo-service.ts";
import BarterSettingsModal from "./barter-settings-modal";
import type {BarterCartProps} from "@/types/ui";

/**
 * Constant TXT.
 */
const TXT = {
	barter : "물물교환",
	loading : "로딩 중...",
	empty : "설정에서 물물교환을 추가해 주세요.",
	qty : "횟수"
} as const;

/**
 * Utility function toSafeBarterQty.
 */
const toSafeBarterQty = (value:unknown):number => {
	const parsed = Number(value);
	if(!Number.isFinite(parsed)){
		return 1;
	}
	return Math.max(1, Math.floor(parsed));
};

/**
 * Utility function clampCompletedQty.
 */
const clampCompletedQty = (value:unknown, qty:number):number => {
	const parsed = Number(value);
	if(!Number.isFinite(parsed)){
		return 0;
	}
	return Math.min(qty, Math.max(0, Math.floor(parsed)));
};

/**
 * Utility function resolveCompletedQty.
 */
const resolveCompletedQty = (barter:UserTodoBarter, qty:number):number => {
	const parsedCompletedQty = Number(barter.completedCount);
	if(Number.isFinite(parsedCompletedQty)){
		return clampCompletedQty(parsedCompletedQty, qty);
	}
	return barter.completed ? qty : 0;
};

const BarterCart:React.FC<BarterCartProps> = ({
	characterId,
	cycle,
	cycleLabel,
	favoriteItems,
	onProgressChange
}) => {
	const [barters, setBarters] = useState<UserTodoBarter[]>([]);
	const [loading, setLoading] = useState(true);
	const [showSettings, setShowSettings] = useState(false);
	const [toggling, setToggling] = useState<Set<number>>(new Set());

	useEffect(() => {
		loadBarters();
	}, [characterId]);

	/**
	 * Utility function async.
	 */
	const loadBarters = async() => {
		try{
			setLoading(true);
			const data = await todoService.getBarterCart(characterId);
			setBarters(data);
		}catch(err){
			console.error("Failed to load barter cart:", err);
		}finally{
			setLoading(false);
		}
	};

	/**
	 * Utility function async.
	 */
	const handleSetCompletedQty = async(barter:UserTodoBarter, nextCompletedQty:number, qty:number) => {
		if(toggling.has(barter.id)) return;
		const safeCompletedQty = clampCompletedQty(nextCompletedQty, qty);
		const previousBarter = {...barter};
		setToggling(prev => new Set(prev).add(barter.id));
		setBarters(prev => prev.map(item => {
			if(item.id !== barter.id){
				return item;
			}
			return {
				...item,
				completed : safeCompletedQty >= qty,
				completedCount : safeCompletedQty,
				...(safeCompletedQty === 0
					? {
						checkedByUserId : undefined,
						checkedByNickname : undefined,
						checkedByCharacterId : undefined,
						checkedByCharacterName : undefined,
						checkedAt : undefined
					}
					: {})
			};
		}));
		try{
			const updated = await todoService.toggleBarterComplete(characterId, barter.id, safeCompletedQty);
			setBarters(prev => prev.map(item => (item.id === barter.id ? {...item, ...updated} : item)));
		}catch(err){
			setBarters(prev => prev.map(item => (item.id === barter.id ? previousBarter : item)));
			console.error("Failed to toggle barter:", err);
		}finally{
			setToggling(prev => {
				const next = new Set(prev);
				next.delete(barter.id);
				return next;
			});
		}
	};

	const filteredBarters = useMemo(() => barters.filter(b => {
		if(b.barterInitCycle !== undefined && b.barterInitCycle !== null){
			return b.barterInitCycle === cycle;
		}
		if(cycle === 1) return b.barterCycle === "daily";
		return b.barterCycle === "weekly";
	}), [barters, cycle]);

	const progress = useMemo(() => {
		return filteredBarters.reduce((acc, barter) => {
			const qty = toSafeBarterQty(barter.barterQty);
			const completedQty = resolveCompletedQty(barter, qty);
			acc.total += qty;
			acc.completed += completedQty;
			return acc;
		}, {completed : 0, total : 0});
	}, [filteredBarters]);

	useEffect(() => {
		onProgressChange?.(progress);
	}, [onProgressChange, progress.completed, progress.total]);

	/**
	 * Utility function getCheckedByLabel.
	 */
	const getCheckedByLabel = (barter:UserTodoBarter, completedQty:number):string => {
		const isServerShared = Number(barter.barterServer) > 0;
		if(!isServerShared || completedQty <= 0){
			return "";
		}
		const nickname = barter.checkedByNickname?.trim();
		const characterName = barter.checkedByCharacterName?.trim();
		if(nickname && characterName){
			return `${nickname} (${characterName})`;
		}
		return nickname || characterName || "";
	};

	if(loading){
		return <div className={styles.loading}>{TXT.loading}</div>;
	}

	return (
		<div className={`${styles.barterCart} ${cycle === 1 ? styles.dailyBarterCart : styles.weeklyBarterCart}`}>
			<div className={styles.sectionHeader}>
				<div className={styles.progressInfo}>
					<span className={styles.taskLabel}>{cycleLabel}</span>
					{progress.total > 0 && (
						<span className={styles.counterText}>{progress.completed}/{progress.total}</span>
					)}
				</div>
				<button className={styles.settingsBtn} onClick={() => setShowSettings(true)}>&#9881;</button>
			</div>
			{filteredBarters.length > 0 ? (
				<div className={styles.barterGrid}>
					{filteredBarters.map(barter => {
						const qty = toSafeBarterQty(barter.barterQty);
						const completedQty = resolveCompletedQty(barter, qty);
						const isCompleted = completedQty >= qty;
						const isPartial = completedQty > 0 && completedQty < qty;
						const checkedBy = getCheckedByLabel(barter, completedQty);
						const disabled = toggling.has(barter.id);
						const npcText = barter.npcName?.trim() || "";
						const regionText = barter.regionName?.trim() || "";
						const locationText = [regionText, npcText].filter(Boolean).join(" - ") || "N/A";
						const titleText = [barter.regionName, barter.npcName].filter(Boolean).join(" - ") || "N/A";
						const itemName = barter.itemName || TXT.barter;

						return (
							<div
								key={barter.id}
								className={`${styles.barterTodoItem} ${isCompleted ? styles.completed : ""} ${isPartial ? styles.partial : ""}`}
								title={titleText}
							>
								<div className={styles.barterItemHeader}>
									<div className={styles.barterItemTitleRow}>
										<span className={styles.barterItemName}>{itemName}</span>
										<div className={styles.barterItemBadgeRow}>
											<span className={styles.barterItemRegionChip}>{locationText}</span>
											<span className={styles.barterQtyBadge}>{completedQty}/{qty}</span>
										</div>
									</div>
								</div>
								<div className={styles.barterItemMeta}>
									<span className={styles.barterItemExchange}>
										{barter.exchangeItemName ? `${barter.exchangeItemName} x${barter.exchangeCost}` : "N/A"}
									</span>
								</div>
								<div className={styles.barterQtyRow}>
									<span className={styles.barterQtyLabel}>{TXT.qty}</span>
									<div className={styles.barterQtyButtons}>
										{Array.from({length : qty}, (_, i) => {
											const checked = i < completedQty;
											const nextCompletedQty = checked ? i : i + 1;
											return (
												<button
													type="button"
													key={`${barter.id}-${i}`}
													className={`${styles.barterQtyButton} ${checked ? styles.completed : ""}`}
													aria-label={`${itemName} ${i + 1}/${qty} ${checked ? "해제" : "체크"}`}
													aria-pressed={checked}
													disabled={disabled}
													onClick={() => handleSetCompletedQty(barter, nextCompletedQty, qty)}
												>
													<span className={styles.barterQtyButtonIndex}>{checked ? "✓" : ""}</span>
												</button>
											);
										})}
									</div>
								</div>
								{checkedBy && <span className={styles.barterCheckedBy}>체크: {checkedBy}</span>}
							</div>
						);
					})}
				</div>
			) : (
				<div className={styles.emptyTracked}>{TXT.empty}</div>
			)}

			{showSettings && (
				<BarterSettingsModal
					characterId={characterId}
					cycle={cycle}
					cycleLabel={cycleLabel}
					existingBarters={filteredBarters}
					favoriteItems={favoriteItems}
					onUpdate={(updated) => {
						const otherBarters = barters.filter(b => {
							if(b.barterInitCycle !== undefined && b.barterInitCycle !== null){
								return b.barterInitCycle !== cycle;
							}
							if(cycle === 1) return b.barterCycle !== "daily";
							return b.barterCycle !== "weekly";
						});
						setBarters([...otherBarters, ...updated]);
					}}
					onClose={() => setShowSettings(false)}
				/>
			)}
		</div>
	);
};

export default BarterCart;
