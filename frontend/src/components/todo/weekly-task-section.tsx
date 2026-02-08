import React, {useState, useMemo} from "react";
import styles from "./todo.module.scss";
import {WeeklyTasks, GameMonster} from "../../types";
import TaskCounter from "./task-counter";
import PhantomTowerSelector from "./phantom-tower-selector";
import BossChecklist from "./boss-checklist";
import BossSettingsModal from "./boss-settings-modal";

interface WeeklyTaskSectionProps{
	weekly:WeeklyTasks;
	fieldBossMonsters:GameMonster[];
	raidMonsters:GameMonster[];
	onChange:(weekly:WeeklyTasks) => void;
}

const SUMMONING_BARRIER_MAX = 7;
const ABYSS_MAX = 3;

function getBlackHoleMax():number{
	const now = new Date();
	const kstOffset = 9 * 60;
	const utc = now.getTime() + now.getTimezoneOffset() * 60000;
	const kst = new Date(utc + kstOffset * 60000);

	// 현재 KST 기준 요일 (0=일, 1=월, ..., 6=토)
	let day = kst.getDay();
	// 06:00 이전이면 전날로 취급
	if(kst.getHours() < 6){
		day = (day + 6) % 7;
	}
	// 월요일 이후 경과 일수 (월=0, 화=1, ..., 일=6)
	const daysSinceMonday = day === 0 ? 6 : day - 1;
	return 14 - daysSinceMonday;
}

const WeeklyTaskSection:React.FC<WeeklyTaskSectionProps> = ({weekly, fieldBossMonsters, raidMonsters, onChange}) => {
	const [showFieldBossSettings, setShowFieldBossSettings] = useState(false);
	const [showRaidSettings, setShowRaidSettings] = useState(false);

	const blackHoleMax = useMemo(() => getBlackHoleMax(), []);

	const trackedFieldBossMonsters = useMemo(() => {
		if(!weekly.fieldBoss.tracked || weekly.fieldBoss.tracked.length === 0) return [];
		return fieldBossMonsters.filter(m => weekly.fieldBoss.tracked.includes(m.monsterId));
	}, [fieldBossMonsters, weekly.fieldBoss.tracked]);

	const trackedRaidMonsters = useMemo(() => {
		if(!weekly.raid.tracked || weekly.raid.tracked.length === 0) return [];
		return raidMonsters.filter(m => weekly.raid.tracked.includes(m.monsterId));
	}, [raidMonsters, weekly.raid.tracked]);

	const completedItems = [
		weekly.summoningBarrier >= SUMMONING_BARRIER_MAX ? 1 : 0,
		weekly.blackHole >= blackHoleMax ? 1 : 0,
		weekly.phantomTower.floor >= 30 && weekly.phantomTower.stage >= 5 ? 1 : 0,
		trackedFieldBossMonsters.length > 0 && weekly.fieldBoss.completed.length >= trackedFieldBossMonsters.length ? 1 : 0,
		weekly.abyss >= ABYSS_MAX ? 1 : 0,
		trackedRaidMonsters.length > 0 && weekly.raid.completed.length >= trackedRaidMonsters.length ? 1 : 0
	];
	const totalItems = 6;
	const completedCount = completedItems.reduce((a, b) => a + b, 0);

	return (
		<div className={styles.taskSection}>
			<div className={styles.sectionHeader}>
				<h4>주간 숙제</h4>
				<span className={styles.progressText}>{completedCount}/{totalItems}</span>
			</div>
			<div className={styles.progressBar}>
				<div className={styles.progressFill} style={{width : `${(completedCount / totalItems) * 100}%`}}/>
			</div>

			<div className={styles.taskList}>
				<TaskCounter
					label="소환의 결계"
					current={weekly.summoningBarrier}
					max={SUMMONING_BARRIER_MAX}
					onChange={(value) => onChange({...weekly, summoningBarrier : value})}
				/>

				<TaskCounter
					label="검은 구멍"
					current={weekly.blackHole}
					max={blackHoleMax}
					onChange={(value) => onChange({...weekly, blackHole : value})}
				/>

				<PhantomTowerSelector
					value={weekly.phantomTower}
					onChange={(value) => onChange({...weekly, phantomTower : value})}
				/>

				<div className={styles.taskItemWithSettings}>
					<BossChecklist
						label="필드 보스"
						monsters={trackedFieldBossMonsters}
						completedIds={weekly.fieldBoss.completed}
						onChange={(completed) => onChange({...weekly, fieldBoss : {...weekly.fieldBoss, completed}})}
					/>
					<button
						className={styles.settingsBtn}
						onClick={() => setShowFieldBossSettings(true)}
						title="필드 보스 설정"
					>
						&#9881;
					</button>
				</div>

				<TaskCounter
					label="어비스"
					current={weekly.abyss}
					max={ABYSS_MAX}
					onChange={(value) => onChange({...weekly, abyss : value})}
				/>

				<div className={styles.taskItemWithSettings}>
					<BossChecklist
						label="레이드"
						monsters={trackedRaidMonsters}
						completedIds={weekly.raid.completed}
						onChange={(completed) => onChange({...weekly, raid : {...weekly.raid, completed}})}
					/>
					<button
						className={styles.settingsBtn}
						onClick={() => setShowRaidSettings(true)}
						title="레이드 설정"
					>
						&#9881;
					</button>
				</div>
			</div>

			{showFieldBossSettings && (
				<BossSettingsModal
					title="필드 보스"
					monsters={fieldBossMonsters}
					trackedIds={weekly.fieldBoss.tracked || []}
					onSave={(tracked) => {
						const newCompleted = weekly.fieldBoss.completed.filter(id => tracked.includes(id));
						onChange({...weekly, fieldBoss : {completed : newCompleted, tracked}});
						setShowFieldBossSettings(false);
					}}
					onClose={() => setShowFieldBossSettings(false)}
				/>
			)}

			{showRaidSettings && (
				<BossSettingsModal
					title="레이드"
					monsters={raidMonsters}
					trackedIds={weekly.raid.tracked || []}
					onSave={(tracked) => {
						const newCompleted = weekly.raid.completed.filter(id => tracked.includes(id));
						onChange({...weekly, raid : {completed : newCompleted, tracked}});
						setShowRaidSettings(false);
					}}
					onClose={() => setShowRaidSettings(false)}
				/>
			)}
		</div>
	);
};

export default WeeklyTaskSection;
