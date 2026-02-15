import React, {useMemo, useState} from "react";
import styles from "./todo.module.scss";
import type {GameMonster} from "@/types";
import TaskCounter from "./task-counter";
import BossChecklist from "./boss-checklist";
import BossSettingsModal from "./boss-settings-modal";
import TaskSettingsModal from "./task-settings-modal";
import MemoTaskModal from "./memo-task-modal";
import BarterCart from "./barter-cart";
import type {WeeklyTaskSectionProps} from "@/types/ui";

const TXT = {
	summoningBarrier : "\uC18C\uD658\uC758 \uACB0\uACC4",
	blackHole : "\uAC80\uC740 \uAD6C\uBA4D",
	fieldBoss : "\uD544\uB4DC \uBCF4\uC2A4",
	abyssReward : "\uC5B4\uBE44\uC2A4 \uC8FC\uAC04 \uBCF4\uC0C1",
	raid : "\uB808\uC774\uB4DC",
	vanguard : "\uBC45\uAC00\uB4DC",
	barter : "\uBB3C\uBB3C\uAD50\uD658",
	emergencyQuest : "\uAE34\uAE09 \uC758\uB8B0",
	weeklyTitle : "\uC8FC\uAC04 \uC219\uC81C",
	memoManage : "\uBA54\uBAA8 \uAD00\uB9AC",
	settings : "\uC124\uC815",
	weeklySettings : "\uC8FC\uAC04 \uC219\uC81C \uC124\uC815",
	weeklyMemoManage : "\uC8FC\uAC04 \uBA54\uBAA8 \uAD00\uB9AC"
} as const;

const SUMMONING_BARRIER_MAX = 7;
const ABYSS_REWARD_DEFAULT_MAX = 4;
const BLACK_HOLE_TOTAL = 14;
const BLACK_HOLE_DAILY_MAX = 8;
const VANGUARD_REWARD_MAX = 3;

const WEEKLY_TASK_DEFS:{key:string; label:string}[] = [
	{key : "summoningBarrier", label : TXT.summoningBarrier},
	{key : "blackHole", label : TXT.blackHole},
	{key : "fieldBoss", label : TXT.fieldBoss},
	{key : "abyssReward", label : TXT.abyssReward},
	{key : "raid", label : TXT.raid},
	{key : "vanguard", label : TXT.vanguard},
	{key : "barter", label : TXT.barter}
];

function getBlackHoleInfo(totalDone:number):{
	maxForWeek:number;
	todayAvailable:number;
	todayWindowCount:number;
	passedCount:number
}{
	const now = new Date();
	const kstOffset = 9 * 60;
	const utc = now.getTime() + now.getTimezoneOffset() * 60000;
	const kst = new Date(utc + kstOffset * 60000);
	
	let day = kst.getDay();
	if(kst.getHours() < 6){
		day = (day + 6) % 7;
	}
	const daysSinceMonday = day === 0 ? 6 : day - 1;
	const maxForWeek = BLACK_HOLE_TOTAL;
	const passedCount = daysSinceMonday;
	const activeSlots = Math.max(0, BLACK_HOLE_TOTAL - passedCount);
	const completedInActiveSlots = Math.max(0, totalDone - passedCount);
	const dailyCapInActiveSlots = Math.min(BLACK_HOLE_DAILY_MAX, activeSlots);
	const todayAvailable = Math.max(0, dailyCapInActiveSlots - completedInActiveSlots);
	const todayWindowCount = dailyCapInActiveSlots;
	return {maxForWeek, todayAvailable, todayWindowCount, passedCount};
}

function normalizeAbyssCompletedSlots(completed:number[] = [], tracked:number[] = []):number[]{
	if(tracked.length === 0 || completed.length === 0){
		return [];
	}
	const looksLikeSlotIndexes = completed.every((value) =>
		Number.isInteger(value) && value >= 0 && value < tracked.length
	);
	if(looksLikeSlotIndexes){
		return [...new Set(completed)].sort((a, b) => a - b);
	}
	const usedSlots = new Set<number>();
	const slots:number[] = [];
	for(const monsterId of completed){
		const slotIndex = tracked.findIndex((trackedMonsterId, idx) =>
			trackedMonsterId === monsterId && !usedSlots.has(idx)
		);
		if(slotIndex !== -1){
			usedSlots.add(slotIndex);
			slots.push(slotIndex);
		}
	}
	return slots.sort((a, b) => a - b);
}

const WeeklyTaskSection:React.FC<WeeklyTaskSectionProps> = ({
	weekly,
	fieldBossMonsters,
	raidMonsters,
	abyssBossMonsters,
	settings,
	characterId,
	weeklyMemos,
	onChange,
	onSettingsChange,
	onMemosChange
}) => {
	const [showFieldBossSettings, setShowFieldBossSettings] = useState(false);
	const [showRaidSettings, setShowRaidSettings] = useState(false);
	const [showAbyssSettings, setShowAbyssSettings] = useState(false);
	const [showTaskSettings, setShowTaskSettings] = useState(false);
	const [showMemo, setShowMemo] = useState(false);
	
	const abyss = weekly.abyss ?? {completed : [], tracked : []};
	const abyssRewardMax = weekly.abyssRewardMax ?? ABYSS_REWARD_DEFAULT_MAX;
	const abyssCompletedSlots = useMemo(
		() => normalizeAbyssCompletedSlots(abyss.completed, abyss.tracked),
		[abyss.completed, abyss.tracked]
	);
	
	const trackedAbyssMonsters = useMemo(() => {
		if(!abyss.tracked || abyss.tracked.length === 0) return [];
		const uniqueIds = [...new Set(abyss.tracked)];
		return uniqueIds.map(id => abyssBossMonsters.find(m => m.monsterId === id)).filter((m):m is GameMonster => !!m);
	}, [abyssBossMonsters, abyss.tracked]);
	
	const trackedFieldBossMonsters = useMemo(() => {
		if(!weekly.fieldBoss.tracked || weekly.fieldBoss.tracked.length === 0) return [];
		return fieldBossMonsters.filter(m => weekly.fieldBoss.tracked.includes(m.monsterId));
	}, [fieldBossMonsters, weekly.fieldBoss.tracked]);
	
	const trackedRaidMonsters = useMemo(() => {
		if(!weekly.raid.tracked || weekly.raid.tracked.length === 0) return [];
		return raidMonsters.filter(m => weekly.raid.tracked.includes(m.monsterId));
	}, [raidMonsters, weekly.raid.tracked]);
	
	const blackHole = useMemo(() => getBlackHoleInfo(weekly.blackHole), [weekly.blackHole]);
	const hidden = useMemo(() => new Set(settings?.hiddenTasks || []), [settings]);
	
	const allDefs = useMemo(() => {
		const defs:{key:string; label:string; isMemo?:boolean}[] = [
			...WEEKLY_TASK_DEFS,
			...(weeklyMemos || []).map(m => ({key : `memo_${m.id}`, label : m.label, isMemo : true}))
		];
		return defs;
	}, [weeklyMemos]);
	
	const visibleItems = useMemo(() => {
		let items = allDefs.filter(t => !hidden.has(t.key));
		if(settings?.weeklyOrder && settings.weeklyOrder.length > 0){
			const orderMap = new Map(settings.weeklyOrder.map((k, i) => [k, i]));
			items = [...items].sort((a, b) => {
				const aIdx = orderMap.get(a.key) ?? 999;
				const bIdx = orderMap.get(b.key) ?? 999;
				return aIdx - bIdx;
			});
		}
		return items;
	}, [allDefs, settings, hidden]);
	
	const getCompletedCount = () => {
		let completed = 0;
		let total = 0;
		visibleItems.forEach(item => {
			switch(item.key){
				case "summoningBarrier":
					total++;
					if(weekly.summoningBarrier >= SUMMONING_BARRIER_MAX) completed++;
					break;
				case "blackHole":
					total++;
					if(weekly.blackHole >= blackHole.maxForWeek) completed++;
					break;
				case "fieldBoss":
					total++;
					if(trackedFieldBossMonsters.length > 0){
						const targetCount = Math.min(trackedFieldBossMonsters.length, abyssRewardMax);
						if(weekly.fieldBoss.completed.length >= targetCount) completed++;
					}
					break;
				case "abyssReward":
					total++;
					if(abyss.tracked.length > 0){
						if(abyssCompletedSlots.length >= abyssRewardMax) completed++;
					}else if((weekly.abyssReward ?? 0) >= abyssRewardMax){
						completed++;
					}
					break;
				case "raid":
					total++;
					if(trackedRaidMonsters.length > 0){
						const uniqueRaidNames = new Set(trackedRaidMonsters.map(m => m.monsterName)).size;
						if(weekly.raid.completed.length >= uniqueRaidNames) completed++;
					}
					break;
				case "vanguard":
					total++;
					if((weekly.vanguard?.reward ?? 0) >= VANGUARD_REWARD_MAX) completed++;
					break;
				case "barter":
					break;
				default:
					if(item.isMemo){
						const memoId = item.key.replace("memo_", "");
						const memo = (weeklyMemos || []).find(m => m.id === memoId);
						if(memo){
							total++;
							if(memo.completed) completed++;
						}
					}
			}
		});
		return {completed, total};
	};
	
	const {completed : completedCount, total : totalItems} = getCompletedCount();
	
	const toggleMemo = (id:string) => {
		const updated = (weeklyMemos || []).map(m => (m.id === id ? {...m, completed : !m.completed} : m));
		onMemosChange(updated);
	};
	
	const renderBlackHole = () => {
		const totalDone = weekly.blackHole;
		const {maxForWeek, todayAvailable, todayWindowCount, passedCount} = blackHole;
		const todayStart = passedCount;
		const todayEnd = Math.min(BLACK_HOLE_TOTAL, todayStart + todayWindowCount);
		return (
			<div className={styles.blackHoleContainer}>
				<div className={styles.taskLabelRow}>
					<span className={styles.taskLabel}>{TXT.blackHole}</span>
					<span className={styles.counterText}>{totalDone}/{maxForWeek}</span>
				</div>
				<div className={styles.blackHoleDots}>
					{Array.from({length : BLACK_HOLE_TOTAL}, (_, i) => {
						let cls = styles.blackHoleDot;
						let disabled = false;
						if(i < totalDone){
							cls += ` ${styles.completed}`;
						}else if(i < passedCount){
							cls += ` ${styles.expired}`;
						}else if(i >= todayStart && i < todayEnd){
							cls += ` ${styles.available}`;
						}else{
							cls += ` ${styles.unavailable}`;
							disabled = true;
						}
						return (
							<button
								key={i}
								className={cls}
								onClick={() => {
									if(i < totalDone){
										onChange({...weekly, blackHole : i});
									}else if(!disabled){
										onChange({...weekly, blackHole : i + 1});
									}
								}}
								disabled={disabled}
							/>
						);
					})}
				</div>
				<div
					className={styles.blackHoleInfo}>{`\uC624\uB298 \uAC00\uB2A5 ${todayAvailable}\uAC1C | \uC774\uBC88 \uC8FC ${totalDone}/${maxForWeek}`}</div>
			</div>
		);
	};
	
	const renderItem = (item:{key:string; label:string; isMemo?:boolean}) => {
		switch(item.key){
			case "summoningBarrier":
				return <TaskCounter key={item.key} label={TXT.summoningBarrier} current={weekly.summoningBarrier}
									max={SUMMONING_BARRIER_MAX}
									onChange={(value) => onChange({...weekly, summoningBarrier : value})}/>;
			case "blackHole":
				return <React.Fragment key={item.key}>{renderBlackHole()}</React.Fragment>;
			case "fieldBoss":
				return (
					<div key={item.key} className={styles.taskItemWithSettings}>
						<BossChecklist label={TXT.fieldBoss} monsters={trackedFieldBossMonsters}
									   completedIds={weekly.fieldBoss.completed} onChange={(completed) => onChange({
							...weekly,
							fieldBoss : {...weekly.fieldBoss, completed}
						})} visualGroup/>
						<button className={styles.settingsBtn} onClick={() => setShowFieldBossSettings(true)}
								title={`${TXT.fieldBoss} ${TXT.settings}`}>&#9881;</button>
					</div>
				);
			case "abyssReward":
				return (
					<div key={item.key} className={styles.taskItemWithSettings}>
						<BossChecklist label={TXT.abyssReward} monsters={trackedAbyssMonsters}
									   completedIds={abyssCompletedSlots} onChange={(completed) => onChange({
							...weekly,
							abyss : {...abyss, completed},
							abyssReward : completed.length
						})} allowDuplicates trackedIds={abyss.tracked} maxCompleted={abyssRewardMax}/>
						<button className={styles.settingsBtn} onClick={() => setShowAbyssSettings(true)}
								title={`\uC5B4\uBE44\uC2A4 \uBCF4\uC2A4 ${TXT.settings}`}>&#9881;</button>
					</div>
				);
			case "raid":
				return (
					<div key={item.key} className={styles.taskItemWithSettings}>
						<BossChecklist label={TXT.raid} monsters={trackedRaidMonsters}
									   completedIds={weekly.raid.completed} onChange={(completed) => onChange({
							...weekly,
							raid : {...weekly.raid, completed}
						})} groupByName/>
						<button className={styles.settingsBtn} onClick={() => setShowRaidSettings(true)}
								title={`${TXT.raid} ${TXT.settings}`}>&#9881;</button>
					</div>
				);
			case "vanguard":
				return (
					<div key={item.key} className={styles.taskItem}>
						<div className={styles.taskLabelRow}>
							<span className={styles.taskLabel}>
								{TXT.vanguard}
								<span className={styles.vanguardEmergencyInline}>
									<span className={styles.vanguardSubLabel}>{TXT.emergencyQuest}</span>
									<button
										className={`${styles.checkCircle} ${styles.small} ${weekly.vanguard?.quest ? styles.completed : ""}`}
										onClick={(e) => {
											e.stopPropagation();
											onChange({
												...weekly,
												vanguard : {
													...(weekly.vanguard ?? {
														reward : 0,
														emergency : 0,
														quest : false
													}), quest : !(weekly.vanguard?.quest ?? false)
												}
											});
										}}
										title={TXT.emergencyQuest}
									/>
								</span>
							</span>
							<span
								className={styles.counterText}>{weekly.vanguard?.reward ?? 0}/{VANGUARD_REWARD_MAX}</span>
						</div>
						<div className={styles.checkCircles}>
							{Array.from({length : VANGUARD_REWARD_MAX}, (_, i) => (
								<button
									key={i}
									className={`${styles.checkCircle} ${i < (weekly.vanguard?.reward ?? 0) ? styles.completed : ""}`}
									onClick={() => {
										const cur = weekly.vanguard?.reward ?? 0;
										const val = i < cur ? i : i + 1;
										onChange({
											...weekly,
											vanguard : {
												...(weekly.vanguard ?? {
													reward : 0,
													emergency : 0,
													quest : false
												}), reward : val
											}
										});
									}}
								/>
							))}
						</div>
					</div>
				);
			case "barter":
				return <BarterCart key={item.key} characterId={characterId} cycle={7} cycleLabel={TXT.barter}/>;
			default:
				if(item.isMemo){
					const memoId = item.key.replace("memo_", "");
					const memo = (weeklyMemos || []).find(m => m.id === memoId);
					if(!memo) return null;
					return (
						<div key={item.key} className={styles.taskItem}>
							<span className={styles.taskLabel}>{memo.label}</span>
							<div className={styles.checkCircles}>
								<button className={`${styles.checkCircle} ${memo.completed ? styles.completed : ""}`}
										onClick={() => toggleMemo(memo.id)}/>
							</div>
						</div>
					);
				}
				return null;
		}
	};
	
	return (
		<div className={styles.taskSection}>
			<div className={styles.sectionHeader}>
				<h4>{TXT.weeklyTitle}</h4>
				<div className={styles.sectionHeaderRight}>
					<span className={styles.progressText}>{completedCount}/{totalItems}</span>
					<button className={styles.headerSettingsBtn} onClick={() => setShowMemo(true)}
							title={TXT.memoManage}>&#9998;</button>
					<button className={styles.headerSettingsBtn} onClick={() => setShowTaskSettings(true)}
							title={TXT.settings}>&#9881;</button>
				</div>
			</div>
			<div className={styles.progressBar}>
				<div className={styles.progressFill}
					 style={{width : `${totalItems > 0 ? (completedCount / totalItems) * 100 : 0}%`}}/>
			</div>
			
			<div className={styles.taskList}>{visibleItems.map(item => renderItem(item))}</div>
			
			{showFieldBossSettings && (
				<BossSettingsModal
					title={TXT.fieldBoss}
					monsters={fieldBossMonsters}
					trackedIds={weekly.fieldBoss.tracked || []}
					groupByName
					maxSelections={abyssRewardMax}
					onSave={(tracked) => {
						const limitedTracked = tracked.slice(0, abyssRewardMax);
						const newCompleted = weekly.fieldBoss.completed.filter(id => limitedTracked.includes(id)).slice(0, abyssRewardMax);
						onChange({...weekly, fieldBoss : {completed : newCompleted, tracked : limitedTracked}});
						setShowFieldBossSettings(false);
					}}
					onClose={() => setShowFieldBossSettings(false)}
				/>
			)}
			
			{showRaidSettings && (
				<BossSettingsModal
					title={TXT.raid}
					monsters={raidMonsters}
					trackedIds={weekly.raid.tracked || []}
					exclusiveByName
					onSave={(tracked) => {
						const newCompleted = weekly.raid.completed.filter(id => tracked.includes(id));
						onChange({...weekly, raid : {completed : newCompleted, tracked}});
						setShowRaidSettings(false);
					}}
					onClose={() => setShowRaidSettings(false)}
				/>
			)}
			
			{showAbyssSettings && (
				<BossSettingsModal
					title="\uC5B4\uBE44\uC2A4 \uBCF4\uC2A4"
					monsters={abyssBossMonsters}
					trackedIds={abyss.tracked || []}
					allowMultiple
					rewardMax={abyssRewardMax}
					onRewardMaxChange={(max) => {
						onChange({...weekly, abyssRewardMax : max});
					}}
					onSave={(tracked) => {
						const previousCompletedMonsterIds = abyssCompletedSlots
							.map((slotIdx) => abyss.tracked[slotIdx])
							.filter((id):id is number => typeof id === "number");
						const usedSlots = new Set<number>();
						const remappedCompletedSlots:number[] = [];
						for(const monsterId of previousCompletedMonsterIds){
							const nextSlotIndex = tracked.findIndex((trackedMonsterId, idx) =>
								trackedMonsterId === monsterId && !usedSlots.has(idx)
							);
							if(nextSlotIndex !== -1){
								usedSlots.add(nextSlotIndex);
								remappedCompletedSlots.push(nextSlotIndex);
							}
						}
						const finalCompleted = remappedCompletedSlots.slice(0, abyssRewardMax).sort((a, b) => a - b);
						onChange({
							...weekly,
							abyss : {completed : finalCompleted, tracked},
							abyssReward : finalCompleted.length
						});
						setShowAbyssSettings(false);
					}}
					onClose={() => setShowAbyssSettings(false)}
				/>
			)}
			
			{showTaskSettings && (
				<TaskSettingsModal
					title={TXT.weeklySettings}
					taskDefs={allDefs.map(t => ({key : t.key, label : t.label}))}
					order={settings?.weeklyOrder}
					hiddenTasks={(settings?.hiddenTasks || []).filter(k => allDefs.some(t => t.key === k))}
					onSave={(order, weeklyHidden) => {
						const weeklyKeys = new Set(allDefs.map(t => t.key));
						const otherHidden = (settings?.hiddenTasks || []).filter(k => !weeklyKeys.has(k));
						onSettingsChange({
							...settings,
							weeklyOrder : order,
							hiddenTasks : [...otherHidden, ...weeklyHidden]
						});
						setShowTaskSettings(false);
					}}
					onClose={() => setShowTaskSettings(false)}
				/>
			)}
			
			{showMemo && (
				<MemoTaskModal
					title={TXT.weeklyMemoManage}
					memos={weeklyMemos || []}
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

export default WeeklyTaskSection;
