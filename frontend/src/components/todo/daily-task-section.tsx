import React, {useEffect, useMemo, useState} from "react";
import styles from "./todo.module.scss";
import TaskSettingsModal from "./task-settings-modal";
import MemoTaskModal from "./memo-task-modal";
import BarterCart from "./barter-cart";
import type {DailyTaskSectionProps} from "@/types/ui";

const DAILY_TASK_DEFS:{key:string; label:string}[] = [
	{key : "dayDungeon", label : "요일 던전"},
	{key : "cashShop", label : "캐시샵"},
	{key : "barter", label : "물물교환"}
];

const DailyTaskSection:React.FC<DailyTaskSectionProps> = ({
	daily,
	settings,
	characterId,
	favoriteItems,
	dailyMemos,
	onChange,
	onSettingsChange,
	onMemosChange
}) => {
	const [showSettings, setShowSettings] = useState(false);
	const [showMemo, setShowMemo] = useState(false);
	const [barterProgress, setBarterProgress] = useState({completed : 0, total : 0});

	useEffect(() => {
		setBarterProgress({completed : 0, total : 0});
	}, [characterId]);

	const hidden = useMemo(() => new Set(settings?.hiddenTasks || []), [settings]);

	const allDefs = useMemo(() => {
		const defs:{key:string; label:string; isMemo?:boolean}[] = [
			...DAILY_TASK_DEFS,
			...(dailyMemos || []).map(m => ({key : `memo_${m.id}`, label : m.label, isMemo : true}))
		];
		return defs;
	}, [dailyMemos]);

	const visibleItems = useMemo(() => {
		let items = allDefs.filter(t => !hidden.has(t.key));
		if(settings?.dailyOrder && settings.dailyOrder.length > 0){
			const orderMap = new Map(settings.dailyOrder.map((k, i) => [k, i]));
			items = [...items].sort((a, b) => {
				const aIdx = orderMap.get(a.key) ?? 999;
				const bIdx = orderMap.get(b.key) ?? 999;
				return aIdx - bIdx;
			});
		}
		return items;
	}, [allDefs, settings, hidden]);

	/**
	 * Utility function getCompletedCount.
	 */
	const getCompletedCount = () => {
		let completed = 0;
		let total = 0;

		visibleItems.forEach(item => {
			if(item.key === "dayDungeon"){
				total++;
				if(daily.dayDungeon) completed++;
			}else if(item.key === "cashShop"){
				total += 2;
				if(daily.freeShopPurchase) completed++;
				if(daily.gemTreasureChest) completed++;
			}else if(item.key === "barter"){
				total += barterProgress.total;
				completed += barterProgress.completed;
			}else if(item.isMemo){
				const memoId = item.key.replace("memo_", "");
				/**
				 * Utility function memo.
				 */
				const memo = (dailyMemos || []).find(m => m.id === memoId);
				if(memo){
					total++;
					if(memo.completed) completed++;
				}
			}
		});

		return {completed, total};
	};

	const {completed : completedCount, total : totalCount} = getCompletedCount();

	/**
	 * Utility function toggleMemo.
	 */
	const toggleMemo = (id:string) => {
		/**
		 * Utility function updated.
		 */
		const updated = (dailyMemos || []).map(m =>
			m.id === id ? {...m, completed : !m.completed} : m
		);
		onMemosChange(updated);
	};

	/**
	 * Utility function renderItem.
	 */
	const renderItem = (item:{key:string; label:string; isMemo?:boolean}) => {
		if(item.key === "dayDungeon"){
			return (
				<div key={item.key} className={styles.taskVariantDayDungeon}>
					<div className={styles.taskItem}>
						<span className={styles.taskLabel}>요일 던전</span>
						<div className={styles.checkCircles}>
							<button
								type="button"
								className={`${styles.checkCircle} ${daily.dayDungeon ? styles.completed : ""}`}
								aria-pressed={daily.dayDungeon}
								onClick={() => onChange({...daily, dayDungeon : !daily.dayDungeon})}
							/>
						</div>
					</div>
				</div>
			);
		}

		if(item.key === "cashShop"){
			return (
				<div key={item.key} className={styles.taskVariantCashShop}>
					<div className={styles.taskItem}>
						<span className={styles.taskLabel}>
							캐시샵
							<span className={styles.serverSharedTag}>서버 공유</span>
						</span>
						<div className={styles.cashShopChecks}>
							<div className={styles.cashShopItem}>
								<button
									type="button"
									className={`${styles.checkCircle} ${daily.freeShopPurchase ? styles.completed : ""}`}
									aria-pressed={daily.freeShopPurchase}
									onClick={() => onChange({...daily, freeShopPurchase : !daily.freeShopPurchase}, "freeShopPurchase")}
								/>
								<span className={styles.cashShopLabel}>무료 상품</span>
							</div>
							<div className={styles.cashShopItem}>
								<button
									type="button"
									className={`${styles.checkCircle} ${daily.gemTreasureChest ? styles.completed : ""}`}
									aria-pressed={daily.gemTreasureChest}
									onClick={() => onChange({...daily, gemTreasureChest : !daily.gemTreasureChest}, "gemTreasureChest")}
								/>
								<span className={styles.cashShopLabel}>보석 상자</span>
							</div>
						</div>
					</div>
				</div>
			);
		}

		if(item.key === "barter"){
			return (
				<div key={item.key} className={styles.taskVariantBarter}>
					<BarterCart
						characterId={characterId}
						cycle={1}
						cycleLabel="물물교환"
						favoriteItems={favoriteItems}
						onProgressChange={setBarterProgress}
					/>
				</div>
			);
		}

		if(item.isMemo){
			const memoId = item.key.replace("memo_", "");
			/**
			 * Utility function memo.
			 */
			const memo = (dailyMemos || []).find(m => m.id === memoId);
			if(!memo) return null;
			return (
				<div key={item.key} className={styles.taskVariantMemo}>
					<div className={styles.taskItem}>
						<span className={styles.taskLabel}>{memo.label}</span>
						<div className={styles.checkCircles}>
							<button
								type="button"
								className={`${styles.checkCircle} ${memo.completed ? styles.completed : ""}`}
								aria-pressed={memo.completed}
								onClick={() => toggleMemo(memo.id)}
							/>
						</div>
					</div>
				</div>
			);
		}

		return null;
	};

	return (
		<div className={styles.taskSection}>
			<div className={styles.sectionHeader}>
				<h4>일일 숙제</h4>
				<div className={styles.sectionHeaderRight}>
					<span className={styles.progressText}>{completedCount}/{totalCount}</span>
					<button className={styles.headerSettingsBtn} onClick={() => setShowMemo(true)} title="메모 관리">&#9998;</button>
					<button className={styles.headerSettingsBtn} onClick={() => setShowSettings(true)} title="설정">&#9881;</button>
				</div>
			</div>
			<div className={styles.progressBar}>
				<div className={styles.progressFill} style={{width : `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`}}/>
			</div>

			<div className={styles.taskList}>
				{visibleItems.map(item => renderItem(item))}
			</div>

			{showSettings && (
				<TaskSettingsModal
					title="일일 숙제 설정"
					taskDefs={allDefs.map(t => ({key : t.key, label : t.label}))}
					order={settings?.dailyOrder}
					hiddenTasks={(settings?.hiddenTasks || []).filter(k => allDefs.some(t => t.key === k))}
					onSave={(order, dailyHidden) => {
						const dailyKeys = new Set(allDefs.map(t => t.key));
						/**
						 * Utility function otherHidden.
						 */
						const otherHidden = (settings?.hiddenTasks || []).filter(k => !dailyKeys.has(k));
						onSettingsChange({...settings, dailyOrder : order, hiddenTasks : [...otherHidden, ...dailyHidden]});
						setShowSettings(false);
					}}
					onClose={() => setShowSettings(false)}
				/>
			)}

			{showMemo && (
				<MemoTaskModal
					title="일일 메모 관리"
					memos={dailyMemos || []}
					onSave={(memos) => {
						onMemosChange(memos);
						setShowMemo(false);
					}}
					onClose={() => setShowMemo(false)}
				/>
			)}
		</div>
	);
};

export default DailyTaskSection;
