import React, {useState, useEffect, useRef, useCallback, useMemo} from "react";
import {UserTodo, TodoData, GameMonster, Resources, UserCharacterRequest, GameClassItem} from "../../types";
import {todoService} from "@/services/todo-service.ts";
import {characterService} from "@/services/character-service.ts";
import {gameClassService} from "@/services/game-class-service.ts";
import {getGameClassColorStyle} from "@/utils";
import DailyTaskSection from "../../components/todo/daily-task-section";
import WeeklyTaskSection from "../../components/todo/weekly-task-section";
import ResourceDisplay from "../../components/todo/resource-display";
import PhantomTowerSelector from "../../components/todo/phantom-tower-selector";
import {Plus, X, Save, GripVertical} from "lucide-react";
import SortableCharacterList from "../../components/user/sortable-character-list";
import EventChecklist from "../../components/todo/event-checklist";
import styles from "./todo.module.scss";

const AUTO_SAVE_DEBOUNCE_MS = 20 * 1000; // 20초

const TodoPage:React.FC = () => {
	const [todos, setTodos] = useState<UserTodo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [fieldBossMonsters, setFieldBossMonsters] = useState<GameMonster[]>([]);
	const [raidMonsters, setRaidMonsters] = useState<GameMonster[]>([]);
	const [abyssBossMonsters, setAbyssBossMonsters] = useState<GameMonster[]>([]);
	const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
	const [dailyCountdown, setDailyCountdown] = useState("");
	const [weeklyCountdown, setWeeklyCountdown] = useState("");
	const [toastMessage, setToastMessage] = useState("");
	const [saving, setSaving] = useState(false);
	const [rankLoading, setRankLoading] = useState<Set<number>>(new Set());
	
	// 캐릭터 추가 팝업
	const [showAddCharacter, setShowAddCharacter] = useState(false);
	const [characterForm, setCharacterForm] = useState<UserCharacterRequest>({
		characterName : "",
		serverId : 2,
		classId : undefined
	});
	const [classes, setClasses] = useState<GameClassItem[]>([]);
	const classCodeById = useMemo(() => new Map(classes.map((cls) => [cls.classId, cls.classCode])), [classes]);
	const classCodeByName = useMemo(() => new Map(classes.map((cls) => [cls.className, cls.classCode])), [classes]);
	const resolveClassCode = (classId?:number, className?:string | null) => {
		if(classId && classCodeById.has(classId)){
			return classCodeById.get(classId);
		}
		if(className && classCodeByName.has(className)){
			return classCodeByName.get(className);
		}
		return undefined;
	};
	const servers:{id:number; name:string}[] = [
		{id : 1, name : "Server 1"}, {id : 2, name : "Server 2"}, {id : 3, name : "Server 3"}, {
			id : 4,
			name : "Server 4"
		},
		{id : 5, name : "Server 5"}, {id : 6, name : "Server 6"}, {id : 7, name : "Server 7"}
	];
	
	// 캐릭터 순서 변경 모달
	const [showReorder, setShowReorder] = useState(false);
	const [reorderList, setReorderList] = useState<{
		characterId:number;
		characterName:string;
		serverName?:string
	}[]>([]);
	const [reorderSaving, setReorderSaving] = useState(false);
	
	const [isDirty, setIsDirty] = useState(false);
	const dirtyRef = useRef<Set<number>>(new Set());
	const todosRef = useRef<UserTodo[]>([]);
	const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	
	useEffect(() => {
		todosRef.current = todos;
	}, [todos]);
	
	useEffect(() => {
		loadData();
		gameClassService.getClasses().then(setClasses).catch(() => {
		});
		return () => {
			if(autoSaveTimer.current){
				clearTimeout(autoSaveTimer.current);
				autoSaveTimer.current = null;
			}
		};
	}, []);
	
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
	
	const fetchRanks = (todosData:UserTodo[]) => {
		const targets = todosData.filter(t => t.serverId != null);
		if(targets.length === 0) return;
		
		const loadingIds = new Set(targets.map(t => t.characterId));
		setRankLoading(loadingIds);
		
		targets.forEach(todo => {
			characterService.fetchRank(todo.characterName, todo.serverId!).then(rank => {
				setTodos(prev => prev.map(t =>
					t.characterId === todo.characterId
						? {
							...t,
							userPower : rank.userPower ?? undefined,
							userVitality : rank.userVitality ?? undefined,
							userAttractiveness : rank.userAttractiveness ?? undefined
						}
						: t
				));
			}).catch(() => {
			}).finally(() => {
				setRankLoading(prev => {
					const next = new Set(prev);
					next.delete(todo.characterId);
					return next;
				});
			});
		});
	};
	
	const loadData = async() => {
		try{
			setLoading(true);
			setError(null);
			const [todosData, fieldBoss, raid, abyssBoss] = await Promise.all([
				todoService.getTodos(),
				todoService.getMonsters("fieldBoss"),
				todoService.getMonsters("raidBoss"),
				todoService.getMonsters("abyssBoss")
			]);
			setTodos(todosData);
			setFieldBossMonsters(fieldBoss);
			setRaidMonsters(raid);
			setAbyssBossMonsters(abyssBoss);
			if(todosData.length > 0 && !selectedCharacterId){
				setSelectedCharacterId(todosData[0].characterId);
			}
			fetchRanks(todosData);
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
	
	useEffect(() => {
		if(!isDirty){
			if(autoSaveTimer.current){
				clearTimeout(autoSaveTimer.current);
				autoSaveTimer.current = null;
			}
			return;
		}
		
		if(autoSaveTimer.current){
			clearTimeout(autoSaveTimer.current);
		}
		autoSaveTimer.current = setTimeout(() => {
			saveAllDirty();
		}, AUTO_SAVE_DEBOUNCE_MS);
		
		return () => {
			if(autoSaveTimer.current){
				clearTimeout(autoSaveTimer.current);
				autoSaveTimer.current = null;
			}
		};
	}, [todos, isDirty, saveAllDirty]);
	
	const handleManualSave = () => {
		if(autoSaveTimer.current){
			clearTimeout(autoSaveTimer.current);
			autoSaveTimer.current = null;
		}
		saveAllDirty();
	};
	
	const showToast = (msg:string) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(""), 3000);
	};
	
	const SERVER_SHARED_DAILY = ["freeShopPurchase", "gemTreasureChest"] as const;
	type ServerSharedDailyField = (typeof SERVER_SHARED_DAILY)[number];
	const isServerSharedDailyField = (field?:string):field is ServerSharedDailyField => {
		return !!field && (SERVER_SHARED_DAILY as readonly string[]).includes(field);
	};
	
	const handleTodoChange = (characterId:number, todoData:TodoData, changedField?:string) => {
		if(isServerSharedDailyField(changedField)){
			const serverId = todos.find(t => t.characterId === characterId)?.serverId;
			if(serverId != null){
				const fieldValue = todoData.daily[changedField];
				setTodos(prev => prev.map(t => {
					if(t.serverId === serverId){
						if(t.characterId === characterId){
							return {...t, todoData};
						}
						return {
							...t,
							todoData : {...t.todoData, daily : {...t.todoData.daily, [changedField] : fieldValue}}
						};
					}
					return t;
				}));
				todos.filter(t => t.serverId === serverId).forEach(t => dirtyRef.current.add(t.characterId));
				setIsDirty(true);
				return;
			}
		}
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
			setCharacterForm({characterName : "", serverId : 2, classId : undefined});
			setShowAddCharacter(false);
			// 데이터를 새로고침하여 새 캐릭터의 todo를 가져옴
			await loadData();
			setSelectedCharacterId(newChar.characterId);
			showToast("캐릭터가 추가되었습니다.");
		}catch(err:any){
			console.error("캐릭터 추가 실패:", err);
			showToast("캐릭터 추가에 실패했습니다");
		}
	};
	
	const openReorderModal = () => {
		setReorderList(todos.map(t => ({
			characterId : t.characterId,
			characterName : t.characterName,
			serverName : t.serverName
		})));
		setShowReorder(true);
	};
	
	const handleReorderSave = async() => {
		setReorderSaving(true);
		try{
			await characterService.reorderCharacters(reorderList.map(c => c.characterId));
			setShowReorder(false);
			await loadData();
			showToast("캐릭터 순서가 변경되었습니다");
		}catch(err:any){
			showToast("순서 변경에 실패했습니다");
		}finally{
			setReorderSaving(false);
		}
	};
	
	const selectedTodo = todos.find(t => t.characterId === selectedCharacterId);
	
	if(loading){
		return (
			<div className={styles.todoPage}>
				<div className={styles.container}>
				<div className={styles.loading}>로딩 중...</div>
				</div>
			</div>
		);
	}
	
	if(error){
		return (
			<div className={styles.todoPage}>
				<div className={styles.container}>
				<div className={styles.error}>{error}</div>
				</div>
			</div>
		);
	}
	
	return (
		<div className={styles.todoPage}>
			<div className={styles.container}>
			<div className={styles.pageHeader}>
				<div className="oYV5kUSv">
					<h1>숙제 관리</h1>
					<p className="-v1-aGH7">캐릭터별 일일/주간 진행도를 체크하고 이벤트 일정을 관리하세요</p>
				</div>
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
					{/* 캐릭터 선택 탭 + 저장 버튼 */}
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
							{todos.length >= 2 && (
								<button
									className={styles.addCharTabBtn}
									onClick={openReorderModal}
									title="순서 변경"
								>
									<GripVertical size={18}/>
								</button>
							)}
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
							setCharacterForm({characterName : "", serverId : 2, classId : undefined});
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
											onChange={(e) => setCharacterForm(prev => ({
												...prev,
												characterName : e.target.value
											}))}
											autoFocus
										/>
									</div>
									<div className={styles.addCharFormGroup}>
										<label>서버</label>
										<select
											value={characterForm.serverId ?? ""}
											onChange={(e) => setCharacterForm(prev => ({
												...prev,
												serverId : e.target.value ? Number(e.target.value) : undefined
											}))}
										>
											<option value="">선택안함</option>
											{servers.map(server => (
												<option key={server.id} value={server.id}>{server.name}</option>
											))}
										</select>
									</div>
									<div className={styles.addCharFormGroup}>
										<label>직업</label>
										<select
											value={characterForm.classId ?? ""}
											onChange={(e) => setCharacterForm(prev => ({
												...prev,
												classId : e.target.value ? Number(e.target.value) : undefined
											}))}
											style={getGameClassColorStyle(resolveClassCode(characterForm.classId))}
										>
											<option value="">선택안함</option>
											{classes.map(cls => (
												<option key={cls.classId} value={cls.classId}>{cls.className}</option>
											))}
										</select>
									</div>
								</div>
								<div className={styles.addCharActions}>
									<button
										className={styles.addCharCancelBtn}
										onClick={() => {
											setShowAddCharacter(false);
											setCharacterForm({characterName : "", serverId : 2, classId : undefined});
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
					
					{/* 순서 변경 모달 */}
					{showReorder && (
						<div className={styles.addCharOverlay} onClick={() => setShowReorder(false)}>
							<div className={styles.addCharacterPopup} onClick={(e) => e.stopPropagation()}>
								<h3>캐릭터 순서 변경</h3>
								<div className={styles.reorderList}>
									<SortableCharacterList
										items={reorderList}
										onReorder={setReorderList}
									/>
								</div>
								<div className={styles.addCharActions}>
									<button
										className={styles.addCharCancelBtn}
										onClick={() => setShowReorder(false)}
									>
										<X size={16}/>
										취소
									</button>
									<button
										className={styles.addCharConfirmBtn}
										onClick={handleReorderSave}
										disabled={reorderSaving}
									>
										<Save size={16}/>
										{reorderSaving ? "저장 중..." : "저장"}
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
									{selectedTodo.serverName &&
										<span className={styles.serverName}>{selectedTodo.serverName}</span>}
									{selectedTodo.className &&
										<span
											className={styles.className}
											style={getGameClassColorStyle(resolveClassCode(selectedTodo.classId, selectedTodo.className))}
										>
											{selectedTodo.className}
										</span>}
									{rankLoading.has(selectedTodo.characterId) && selectedTodo.userPower == null && selectedTodo.userVitality == null && selectedTodo.userAttractiveness == null ? (
										<div className={styles.characterStats}>
											<span className={styles.statLoading}>랭크 로딩중...</span>
										</div>
									) : (selectedTodo.userPower != null || selectedTodo.userVitality != null || selectedTodo.userAttractiveness != null) && (
										<div className={styles.characterStats}>
											{selectedTodo.userPower != null && <span
												className={styles.statPower}>전투력 {selectedTodo.userPower.toLocaleString()}</span>}
											{selectedTodo.userVitality != null && <span
												className={styles.statVitality}>생활력 {selectedTodo.userVitality.toLocaleString()}</span>}
											{selectedTodo.userAttractiveness != null && <span
												className={styles.statAttractiveness}>매력 {selectedTodo.userAttractiveness.toLocaleString()}</span>}
										</div>
									)}
								</div>
								<div className={styles.headerResources}>
									<ResourceDisplay
										resources={selectedTodo.todoData.resources || {}}
										onChange={(resources:Resources) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											resources
										})}
									/>
									<PhantomTowerSelector
										value={selectedTodo.todoData.weekly.phantomTower}
										onChange={(phantomTower) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											weekly : {...selectedTodo.todoData.weekly, phantomTower}
										})}
									/>
								</div>
							</div>
							
							{/* 2섹션 레이아웃 */}
							<div className={styles.sectionsGrid}>
								<div className={styles.section}>
									<DailyTaskSection
										daily={selectedTodo.todoData.daily}
										settings={selectedTodo.todoData.settings}
										characterId={selectedTodo.characterId}
										dailyMemos={selectedTodo.todoData.dailyMemos}
										onChange={(daily, changedField) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											daily
										}, changedField)}
										onSettingsChange={(settings) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											settings
										})}
										onMemosChange={(memos) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											dailyMemos : memos
										})}
									/>
								</div>
								<div className={styles.section}>
									<WeeklyTaskSection
										weekly={selectedTodo.todoData.weekly}
										fieldBossMonsters={fieldBossMonsters}
										raidMonsters={raidMonsters}
										abyssBossMonsters={abyssBossMonsters}
										settings={selectedTodo.todoData.settings}
										characterId={selectedTodo.characterId}
										weeklyMemos={selectedTodo.todoData.weeklyMemos}
										onChange={(weekly) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											weekly
										})}
										onSettingsChange={(settings) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											settings
										})}
										onMemosChange={(memos) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											weeklyMemos : memos
										})}
									/>
								</div>
							</div>
						</div>
					)}
					
					<EventChecklist/>
				</>
			)}
			</div>
		</div>
	);
};

export default TodoPage;
