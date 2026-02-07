import React, {useState, useEffect, useRef, useCallback} from "react";
import {UserTodo, TodoData, GameMonster, Resources, UserCharacterRequest} from "../../types";
import {todoService} from "../../services/todo-service";
import {characterService} from "../../services/character-service";
import DailyTaskSection from "../../components/todo/daily-task-section";
import WeeklyTaskSection from "../../components/todo/weekly-task-section";
import ResourceDisplay from "../../components/todo/resource-display";
import BarterCart from "../../components/todo/barter-cart";
import {Plus, X, Save} from "lucide-react";
import styles from "./todo.module.scss";

const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5분

const TodoPage:React.FC = () => {
	const [todos, setTodos] = useState<UserTodo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [fieldBossMonsters, setFieldBossMonsters] = useState<GameMonster[]>([]);
	const [raidMonsters, setRaidMonsters] = useState<GameMonster[]>([]);
	const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
	const [dailyCountdown, setDailyCountdown] = useState("");
	const [weeklyCountdown, setWeeklyCountdown] = useState("");
	const [toastMessage, setToastMessage] = useState("");
	const [saving, setSaving] = useState(false);

	// 캐릭터 추가 팝업
	const [showAddCharacter, setShowAddCharacter] = useState(false);
	const [characterForm, setCharacterForm] = useState<UserCharacterRequest>({
		characterName: "",
		serverName: "",
		className: ""
	});

	const [isDirty, setIsDirty] = useState(false);
	const dirtyRef = useRef<Set<number>>(new Set());
	const todosRef = useRef<UserTodo[]>([]);
	const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		todosRef.current = todos;
	}, [todos]);

	useEffect(() => {
		loadData();
		return () => {
			if(autoSaveTimer.current) clearInterval(autoSaveTimer.current);
		};
	}, []);

	// 자동 저장 (5분)
	useEffect(() => {
		autoSaveTimer.current = setInterval(() => {
			saveAllDirty();
		}, AUTO_SAVE_INTERVAL);
		return () => {
			if(autoSaveTimer.current) clearInterval(autoSaveTimer.current);
		};
	}, []);

	// 카운트다운
	useEffect(() => {
		const updateCountdown = () => {
			const now = new Date();
			const kstOffset = 9 * 60;
			const utc = now.getTime() + now.getTimezoneOffset() * 60000;
			const kst = new Date(utc + kstOffset * 60000);

			// 일일 리셋: 매일 06:00 KST
			const dailyReset = new Date(kst);
			dailyReset.setHours(6, 0, 0, 0);
			if(kst.getHours() >= 6){
				dailyReset.setDate(dailyReset.getDate() + 1);
			}
			const dailyDiff = dailyReset.getTime() - kst.getTime();
			const dH = Math.floor(dailyDiff / 3600000);
			const dM = Math.floor((dailyDiff % 3600000) / 60000);
			const dS = Math.floor((dailyDiff % 60000) / 1000);
			setDailyCountdown(`${dH.toString().padStart(2, "0")}:${dM.toString().padStart(2, "0")}:${dS.toString().padStart(2, "0")}`);

			// 주간 리셋: 매주 월요일 06:00 KST
			const weeklyReset = new Date(kst);
			const dayOfWeek = kst.getDay();
			let daysUntilMonday = (1 - dayOfWeek + 7) % 7;
			if(daysUntilMonday === 0 && kst.getHours() >= 6){
				daysUntilMonday = 7;
			}
			if(daysUntilMonday === 0 && kst.getHours() < 6){
				daysUntilMonday = 0;
			}
			weeklyReset.setDate(weeklyReset.getDate() + daysUntilMonday);
			weeklyReset.setHours(6, 0, 0, 0);
			const weeklyDiff = weeklyReset.getTime() - kst.getTime();
			const wD = Math.floor(weeklyDiff / 86400000);
			const wH = Math.floor((weeklyDiff % 86400000) / 3600000);
			const wM = Math.floor((weeklyDiff % 3600000) / 60000);
			const wS = Math.floor((weeklyDiff % 60000) / 1000);
			setWeeklyCountdown(
				wD > 0
					? `${wD}일 ${wH.toString().padStart(2, "0")}:${wM.toString().padStart(2, "0")}:${wS.toString().padStart(2, "0")}`
					: `${wH.toString().padStart(2, "0")}:${wM.toString().padStart(2, "0")}:${wS.toString().padStart(2, "0")}`
			);
		};

		updateCountdown();
		const interval = setInterval(updateCountdown, 1000);
		return () => clearInterval(interval);
	}, []);

	const loadData = async() => {
		try{
			setLoading(true);
			setError(null);
			const [todosData, fieldBoss, raid] = await Promise.all([
				todoService.getTodos(),
				todoService.getMonsters("fieldBoss"),
				todoService.getMonsters("raidBoss")
			]);
			setTodos(todosData);
			setFieldBossMonsters(fieldBoss);
			setRaidMonsters(raid);
			if(todosData.length > 0 && !selectedCharacterId){
				setSelectedCharacterId(todosData[0].characterId);
			}
		}catch(err:any){
			setError(err.message || "데이터를 불러오는데 실패했습니다.");
		}finally{
			setLoading(false);
		}
	};

	const saveAllDirty = useCallback(async() => {
		const dirtyIds = Array.from(dirtyRef.current);
		if(dirtyIds.length === 0) return;

		setSaving(true);
		try{
			const currentTodos = todosRef.current;
			await Promise.all(
				dirtyIds.map(charId => {
					const todo = currentTodos.find(t => t.characterId === charId);
					if(todo){
						return todoService.updateTodo(charId, todo.todoData);
					}
					return Promise.resolve();
				})
			);
			dirtyRef.current.clear();
			setIsDirty(false);
			showToast("저장되었습니다");
		}catch(err){
			console.error("Failed to save:", err);
			showToast("저장에 실패했습니다");
		}finally{
			setSaving(false);
		}
	}, []);

	const handleManualSave = () => {
		saveAllDirty();
	};

	const showToast = (msg:string) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(""), 3000);
	};

	const handleTodoChange = (characterId:number, todoData:TodoData) => {
		setTodos(prev => prev.map(t =>
			t.characterId === characterId ? {...t, todoData} : t
		));
		dirtyRef.current.add(characterId);
		setIsDirty(true);
	};

	const handleAddCharacter = async() => {
		if(!characterForm.characterName.trim()) return;
		try{
			const newChar = await characterService.createCharacter(characterForm);
			setCharacterForm({characterName: "", serverName: "", className: ""});
			setShowAddCharacter(false);
			// 데이터 새로고침하여 새 캐릭터의 todo를 가져옴
			await loadData();
			setSelectedCharacterId(newChar.characterId);
			showToast("캐릭터가 추가되었습니다");
		}catch(err:any){
			console.error("캐릭터 추가 실패:", err);
			showToast("캐릭터 추가에 실패했습니다");
		}
	};

	const selectedTodo = todos.find(t => t.characterId === selectedCharacterId);

	if(loading){
		return (
			<div className={styles.container}>
				<div className={styles.loading}>로딩 중...</div>
			</div>
		);
	}

	if(error){
		return (
			<div className={styles.container}>
				<div className={styles.error}>{error}</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.pageHeader}>
				<h2>숙제 관리</h2>
				<div className={styles.resetTimers}>
					<div className={styles.resetTimer}>
						<span>일일 리셋</span>
						<span className={styles.countdown}>{dailyCountdown}</span>
					</div>
					<div className={styles.resetTimer}>
						<span>주간 리셋</span>
						<span className={styles.countdown}>{weeklyCountdown}</span>
					</div>
				</div>
			</div>

			{todos.length === 0 && !showAddCharacter ? (
				<div className={styles.empty}>
					<p>등록된 캐릭터가 없습니다.</p>
					<button className={styles.addCharBtn} onClick={() => setShowAddCharacter(true)}>
						<Plus size={16}/>
						캐릭터 추가
					</button>
				</div>
			) : (
				<>
					{/* 캐릭터 셀렉터 + 저장 버튼 */}
					<div className={styles.selectorRow}>
						<div className={styles.characterSelector}>
							{todos.map(todo => (
								<button
									key={todo.characterId}
									className={`${styles.characterTab} ${todo.characterId === selectedCharacterId ? styles.active : ""}`}
									onClick={() => setSelectedCharacterId(todo.characterId)}
								>
									<span className={styles.charTabName}>{todo.characterName}</span>
									{todo.serverName && <span className={styles.charTabServer}>{todo.serverName}</span>}
								</button>
							))}
							<button
								className={styles.addCharTabBtn}
								onClick={() => setShowAddCharacter(true)}
								title="캐릭터 추가"
							>
								<Plus size={18}/>
							</button>
						</div>
						<div className={styles.saveArea}>
							{toastMessage && <span className={styles.toast}>{toastMessage}</span>}
							<button
								className={styles.saveBtn}
								onClick={handleManualSave}
								disabled={saving || !isDirty}
							>
								{saving ? "저장 중..." : "저장"}
							</button>
						</div>
					</div>

					{/* 캐릭터 추가 팝업 */}
					{showAddCharacter && (
						<div className={styles.addCharOverlay} onClick={() => {
							setShowAddCharacter(false);
							setCharacterForm({characterName: "", serverName: "", className: ""});
						}}>
							<div className={styles.addCharacterPopup} onClick={(e) => e.stopPropagation()}>
								<h3>새 캐릭터 추가</h3>
								<div className={styles.addCharFormFields}>
									<div className={styles.addCharFormGroup}>
										<label>캐릭터 이름 *</label>
										<input
											type="text"
											placeholder="캐릭터 이름"
											value={characterForm.characterName}
											onChange={(e) => setCharacterForm(prev => ({...prev, characterName: e.target.value}))}
											autoFocus
										/>
									</div>
									<div className={styles.addCharFormGroup}>
										<label>서버</label>
										<input
											type="text"
											placeholder="서버 이름"
											value={characterForm.serverName || ""}
											onChange={(e) => setCharacterForm(prev => ({...prev, serverName: e.target.value}))}
										/>
									</div>
									<div className={styles.addCharFormGroup}>
										<label>직업</label>
										<input
											type="text"
											placeholder="직업"
											value={characterForm.className || ""}
											onChange={(e) => setCharacterForm(prev => ({...prev, className: e.target.value}))}
										/>
									</div>
								</div>
								<div className={styles.addCharActions}>
									<button
										className={styles.addCharCancelBtn}
										onClick={() => {
											setShowAddCharacter(false);
											setCharacterForm({characterName: "", serverName: "", className: ""});
										}}
									>
										<X size={16}/>
										취소
									</button>
									<button
										className={styles.addCharConfirmBtn}
										onClick={handleAddCharacter}
										disabled={!characterForm.characterName.trim()}
									>
										<Save size={16}/>
										추가
									</button>
								</div>
							</div>
						</div>
					)}

					{selectedTodo && (
						<div className={styles.characterView}>
							{/* 캐릭터 정보 + 리소스 */}
							<div className={styles.characterHeader}>
								<div className={styles.characterInfo}>
									<h3>{selectedTodo.characterName}</h3>
									{selectedTodo.serverName && <span className={styles.serverName}>{selectedTodo.serverName}</span>}
									{selectedTodo.className && <span className={styles.className}>{selectedTodo.className}</span>}
								</div>
								<ResourceDisplay
									resources={selectedTodo.todoData.resources || {}}
									onChange={(resources:Resources) => handleTodoChange(selectedTodo.characterId, {...selectedTodo.todoData, resources})}
								/>
							</div>

							{/* 2섹션 레이아웃 */}
							<div className={styles.sectionsGrid}>
								<div className={styles.section}>
									<h4 className={styles.sectionTitle}>일일</h4>
									<DailyTaskSection
										daily={selectedTodo.todoData.daily}
										onChange={(daily) => handleTodoChange(selectedTodo.characterId, {...selectedTodo.todoData, daily})}
									/>
									<BarterCart characterId={selectedTodo.characterId} cycle={1} cycleLabel="일일"/>
								</div>
								<div className={styles.section}>
									<h4 className={styles.sectionTitle}>주간</h4>
									<WeeklyTaskSection
										weekly={selectedTodo.todoData.weekly}
										fieldBossMonsters={fieldBossMonsters}
										raidMonsters={raidMonsters}
										onChange={(weekly) => handleTodoChange(selectedTodo.characterId, {...selectedTodo.todoData, weekly})}
									/>
									<BarterCart characterId={selectedTodo.characterId} cycle={7} cycleLabel="주간"/>
								</div>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default TodoPage;
