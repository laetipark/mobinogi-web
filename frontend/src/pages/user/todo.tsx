import React, {useState, useEffect, useRef, useCallback, useMemo} from "react";
import {
	UserTodo,
	TodoData,
	GameMonster,
	Resources,
	UserCharacterRequest,
	GameClassItem,
	FavoriteGameItem,
	GameItemSummary
} from "../../types";
import {todoService} from "@/services/todo-service.ts";
import {characterService} from "@/services/character-service.ts";
import {gameClassService} from "@/services/game-class-service.ts";
import {GameItemService} from "@/services/game-item-service.ts";
import {getGameClassColorStyle} from "@/utils";
import DailyTaskSection from "../../components/todo/daily-task-section";
import WeeklyTaskSection from "../../components/todo/weekly-task-section";
import ResourceDisplay from "../../components/todo/resource-display";
import PhantomTowerSelector from "../../components/todo/phantom-tower-selector";
import ItemDetailModal from "../../components/game/item-detail-modal";
import {Plus, X, Save, GripVertical, Info} from "lucide-react";
import SortableCharacterList from "../../components/user/sortable-character-list";
import EventChecklist from "../../components/todo/event-checklist";
import {useSeo} from "@/hooks/use-seo";
import {UNSAFE_NavigationContext, useBeforeUnload} from "react-router-dom";
import styles from "./todo.module.scss";

const AUTO_SAVE_DEBOUNCE_MS = 5 * 1000; // 5s
const HOMEWORK_SAVE_DEBOUNCE_MS = 2 * 1000; // Homework checkbox changes use 2s debounce
const FAVORITE_STORAGE_KEY = "mobinogi:todoFavoriteItems";
const FAVORITE_SEARCH_DEBOUNCE_MS = 300;
type AutoSaveStrategy = "debounce" | "leadingTrailingThrottle";

const loadFavoriteItems = ():FavoriteGameItem[] => {
	if(typeof window === "undefined"){
		return [];
	}
	try{
		const raw = window.localStorage.getItem(FAVORITE_STORAGE_KEY);
		if(!raw){
			return [];
		}
		const parsed = JSON.parse(raw);
		if(!Array.isArray(parsed)){
			return [];
		}
		return parsed
			.filter((item):item is FavoriteGameItem =>
				typeof item?.itemId === "number" && typeof item?.itemName === "string"
			)
			.map(item => ({
				itemId : item.itemId,
				itemName : item.itemName,
				itemType : item.itemType,
				itemRarity : item.itemRarity
			}));
	}catch{
		return [];
	}
};

const saveFavoriteItems = (items:FavoriteGameItem[]) => {
	if(typeof window === "undefined"){
		return;
	}
	try{
		window.localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(items));
	}catch{
		// Ignore write errors (private mode/quota issues)
	}
};

const TodoPage:React.FC = () => {
	useSeo({
		title : "숙제 관리",
		description : "캐릭터별 일일/주간 숙제 진행 상태를 관리하세요.",
		canonicalPath : "/todo",
		noindex : true
	});

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
	const RANK_STALE_MS = 10 * 60 * 1000;
	const isRankStale = (rankUpdatedAt?:string):boolean => {
		if(!rankUpdatedAt){
			return true;
		}
		const updatedAtMs = new Date(rankUpdatedAt).getTime();
		if(Number.isNaN(updatedAtMs)){
			return true;
		}
		return Date.now() - updatedAtMs >= RANK_STALE_MS;
	};
	const [favoriteItems, setFavoriteItems] = useState<FavoriteGameItem[]>(loadFavoriteItems);
	const [favoriteSearchInput, setFavoriteSearchInput] = useState("");
	const [favoriteKeyword, setFavoriteKeyword] = useState("");
	const [favoriteCandidates, setFavoriteCandidates] = useState<GameItemSummary[]>([]);
	const [favoriteLoading, setFavoriteLoading] = useState(false);
	const [selectedFavoriteItem, setSelectedFavoriteItem] = useState<GameItemSummary | null>(null);
	
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
	const requestedCharacterIdRef = useRef<number | null>((() => {
		if(typeof window === "undefined"){
			return null;
		}
		const raw = new URLSearchParams(window.location.search).get("characterId");
		if(!raw){
			return null;
		}
		const parsed = Number(raw);
		return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
	})());
	const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const activeAutoSaveStrategyRef = useRef<AutoSaveStrategy | null>(null);
	const autoSaveThrottleHasPendingRef = useRef(false);
	const routeLeaveGuardInFlightRef = useRef(false);
	const touchStartXRef = useRef<number | null>(null);
	const touchStartYRef = useRef<number | null>(null);
	const touchStartTimeRef = useRef<number>(0);
	
	useEffect(() => {
		todosRef.current = todos;
	}, [todos]);

	useEffect(() => {
		saveFavoriteItems(favoriteItems);
	}, [favoriteItems]);
	
	useEffect(() => {
		loadData();
		gameClassService.getClasses().then(setClasses).catch(() => {
		});
		return () => {
			if(autoSaveTimer.current){
				clearTimeout(autoSaveTimer.current);
				autoSaveTimer.current = null;
			}
			activeAutoSaveStrategyRef.current = null;
			autoSaveThrottleHasPendingRef.current = false;
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

	useEffect(() => {
		const timer = setTimeout(() => {
			setFavoriteKeyword(favoriteSearchInput.trim());
		}, FAVORITE_SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [favoriteSearchInput]);

	useEffect(() => {
		let active = true;
		const searchFavoriteItems = async() => {
			if(!favoriteKeyword){
				setFavoriteCandidates([]);
				setFavoriteLoading(false);
				return;
			}
			setFavoriteLoading(true);
			try{
				const result = await GameItemService.getGameItems({
					keyword : favoriteKeyword,
					page : 0,
					size : 20,
					sortBy : "itemName",
					sortDir : "asc"
				});
				if(active){
					setFavoriteCandidates(result.content);
				}
			}catch(err){
				console.error("Failed to search game items:", err);
				if(active){
					setFavoriteCandidates([]);
				}
			}finally{
				if(active){
					setFavoriteLoading(false);
				}
			}
		};
		searchFavoriteItems();
		return () => {
			active = false;
		};
	}, [favoriteKeyword]);
	
	const fetchRanks = (todosData:UserTodo[]) => {
		const targets = todosData.filter(t =>
			t.serverId != null &&
			Boolean(t.characterName?.trim()) &&
			isRankStale(t.rankUpdatedAt)
		);
		if(targets.length === 0){
			return;
		}
		
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
							userAttractiveness : rank.userAttractiveness ?? undefined,
							rankUpdatedAt : rank.updatedAt ?? t.rankUpdatedAt
						}
						: t
				));
			}).catch((error) => {
				console.warn(`Failed to fetch rank for todo character ${todo.characterId} (${todo.characterName})`, error);
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
			const todosData = await todoService.getTodos();
			let rankReadyTodos = todosData;
			if(todosData.some(todo => todo.serverId == null || !todo.characterName)){
				try{
					const characters = await characterService.getMyCharacters();
					const characterById = new Map(characters.map((character) => [character.characterId, character]));
					rankReadyTodos = todosData.map((todo) => {
						const character = characterById.get(todo.characterId);
						if(!character){
							return todo;
						}
						return {
							...todo,
							characterName : todo.characterName || character.characterName,
							serverId : todo.serverId ?? character.serverId,
							serverName : todo.serverName ?? character.serverName,
							classId : todo.classId ?? character.classId,
							className : todo.className ?? character.className
						};
					});
				}catch(error){
					console.warn("Failed to backfill todo rank targets from characters", error);
				}
			}
			setTodos(rankReadyTodos);
			const monsterResults = await Promise.allSettled([
				todoService.getMonsters("fieldBoss"),
				todoService.getMonsters("raidBoss"),
				todoService.getMonsters("abyssBoss")
			]);
			if(monsterResults[0].status === "fulfilled"){
				setFieldBossMonsters(monsterResults[0].value);
			}else{
				setFieldBossMonsters([]);
				console.warn("Failed to load field boss monsters", monsterResults[0].reason);
			}
			if(monsterResults[1].status === "fulfilled"){
				setRaidMonsters(monsterResults[1].value);
			}else{
				setRaidMonsters([]);
				console.warn("Failed to load raid monsters", monsterResults[1].reason);
			}
			if(monsterResults[2].status === "fulfilled"){
				setAbyssBossMonsters(monsterResults[2].value);
			}else{
				setAbyssBossMonsters([]);
				console.warn("Failed to load abyss boss monsters", monsterResults[2].reason);
			}
			const requestedCharacterId = requestedCharacterIdRef.current;
			const requestedTodo = requestedCharacterId == null
				? null
				: rankReadyTodos.find((todo) => todo.characterId === requestedCharacterId) ?? null;
			if(requestedTodo){
				setSelectedCharacterId(requestedTodo.characterId);
			}else if(rankReadyTodos.length > 0 && !selectedCharacterId){
				setSelectedCharacterId(rankReadyTodos[0].characterId);
			}
			fetchRanks(rankReadyTodos);
		}catch(err:any){
			setError(err.message || "데이터를 불러오는데 실패했습니다.");
		}finally{
			setLoading(false);
		}
	};
	
	const saveAllDirty = useCallback(async(options?:{targetIds?:number[]; silent?:boolean}) => {
		const dirtyIds = (options?.targetIds ?? Array.from(dirtyRef.current))
			.filter((charId, index, array) => array.indexOf(charId) === index)
			.filter(charId => dirtyRef.current.has(charId));
		if(dirtyIds.length === 0) return true;
		
		const currentTodos = todosRef.current;
		const saveTargets = dirtyIds
			.map(charId => {
				const todo = currentTodos.find(t => t.characterId === charId);
				if(!todo){
					return null;
				}
				return {charId, todoData : todo.todoData};
			})
			.filter((target):target is {charId:number; todoData:TodoData} => target != null);
		if(saveTargets.length === 0) return true;
		
		setSaving(true);
		try{
			await Promise.all(
				saveTargets.map(({charId, todoData}) => todoService.updateTodo(charId, todoData))
			);
			const latestTodos = todosRef.current;
			saveTargets.forEach(({charId, todoData}) => {
				const latestTodo = latestTodos.find(t => t.characterId === charId);
				if(latestTodo?.todoData === todoData){
					dirtyRef.current.delete(charId);
				}
			});
			const hasDirty = dirtyRef.current.size > 0;
			setIsDirty(hasDirty);
			if(!options?.silent){
				showToast("저장되었습니다");
			}
			return true;
		}catch(err){
			console.error("Failed to save:", err);
			if(!options?.silent){
				showToast("저장에 실패했습니다");
			}
			return false;
		}finally{
			setSaving(false);
		}
	}, []);
	
	const clearAutoSaveTimer = useCallback(() => {
		if(autoSaveTimer.current){
			clearTimeout(autoSaveTimer.current);
			autoSaveTimer.current = null;
		}
		activeAutoSaveStrategyRef.current = null;
	}, []);
	
	const scheduleThrottleCooldown = useCallback((intervalMs:number) => {
		activeAutoSaveStrategyRef.current = "leadingTrailingThrottle";
		autoSaveTimer.current = setTimeout(() => {
			autoSaveTimer.current = null;
			if(!autoSaveThrottleHasPendingRef.current){
				activeAutoSaveStrategyRef.current = null;
				return;
			}
			autoSaveThrottleHasPendingRef.current = false;
			void saveAllDirty();
			scheduleThrottleCooldown(intervalMs);
		}, intervalMs);
	}, [saveAllDirty]);
	
	const scheduleAutoSave = useCallback((options?:{debounceMs?:number; strategy?:AutoSaveStrategy}) => {
		const debounceMs = options?.debounceMs ?? AUTO_SAVE_DEBOUNCE_MS;
		const strategy = options?.strategy ?? "debounce";
		const activeStrategy = activeAutoSaveStrategyRef.current;
		
		if(activeStrategy && activeStrategy !== strategy){
			autoSaveThrottleHasPendingRef.current = false;
			clearAutoSaveTimer();
		}
		
		if(strategy === "leadingTrailingThrottle"){
			if(autoSaveTimer.current && activeAutoSaveStrategyRef.current === "leadingTrailingThrottle"){
				autoSaveThrottleHasPendingRef.current = true;
				return;
			}
			autoSaveThrottleHasPendingRef.current = false;
			void saveAllDirty();
			scheduleThrottleCooldown(debounceMs);
			return;
		}
		
		autoSaveThrottleHasPendingRef.current = false;
		clearAutoSaveTimer();
		activeAutoSaveStrategyRef.current = "debounce";
		autoSaveTimer.current = setTimeout(() => {
			autoSaveTimer.current = null;
			activeAutoSaveStrategyRef.current = null;
			void saveAllDirty();
		}, debounceMs);
	}, [clearAutoSaveTimer, saveAllDirty, scheduleThrottleCooldown]);
	
	const handleManualSave = () => {
		autoSaveThrottleHasPendingRef.current = false;
		clearAutoSaveTimer();
		saveAllDirty();
	};
	
	const handleSelectCharacter = useCallback(async(nextCharacterId:number) => {
		if(nextCharacterId === selectedCharacterId){
			return;
		}
		if(dirtyRef.current.size > 0){
			autoSaveThrottleHasPendingRef.current = false;
			clearAutoSaveTimer();
			const saved = await saveAllDirty({silent : true});
			if(!saved){
				showToast("??μ뿉 ?ㅽ뙣?덉뒿?덈떎");
				return;
			}
		}
		setSelectedCharacterId(nextCharacterId);
	}, [clearAutoSaveTimer, saveAllDirty, selectedCharacterId]);
	
	const showToast = (msg:string) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(""), 3000);
	};
	
	const navigationContext = React.useContext(UNSAFE_NavigationContext);
	const routeBlocker = useMemo(() => ({
		state : "unblocked" as const,
		proceed : () => {
		},
		reset : () => {
		}
	}), []);
	
	useBeforeUnload(
		useCallback((event) => {
			if(dirtyRef.current.size === 0){
				return;
			}
			event.preventDefault();
			event.returnValue = "";
		}, [])
	);
	
	useEffect(() => {
		if(routeBlocker.state !== "blocked"){
			routeLeaveGuardInFlightRef.current = false;
			return;
		}
		if(routeLeaveGuardInFlightRef.current){
			return;
		}
		routeLeaveGuardInFlightRef.current = true;
		void (async() => {
			autoSaveThrottleHasPendingRef.current = false;
			clearAutoSaveTimer();
			const saved = await saveAllDirty({silent : true});
			if(saved){
				routeBlocker.proceed();
				return;
			}
			showToast("???關肉???쎈솭??됰뮸??덈뼄");
			routeBlocker.reset();
			routeLeaveGuardInFlightRef.current = false;
		})();
	}, [clearAutoSaveTimer, routeBlocker, saveAllDirty]);
	
	useEffect(() => {
		const navigator = navigationContext?.navigator as {block?:(cb:(tx:{retry:() => void}) => void) => () => void} | undefined;
		if(!navigator?.block){
			return;
		}
		const unblock = navigator.block((tx) => {
			if(routeLeaveGuardInFlightRef.current){
				return;
			}
			if(dirtyRef.current.size === 0){
				unblock();
				tx.retry();
				return;
			}
			routeLeaveGuardInFlightRef.current = true;
			void (async() => {
				autoSaveThrottleHasPendingRef.current = false;
				clearAutoSaveTimer();
				const saved = await saveAllDirty({silent : true});
				if(saved){
					unblock();
					tx.retry();
					return;
				}
				showToast("????쒑굢????덉넮???곕????덈펲");
				routeLeaveGuardInFlightRef.current = false;
			})();
		});
		return () => {
			routeLeaveGuardInFlightRef.current = false;
			unblock();
		};
	}, [clearAutoSaveTimer, navigationContext, saveAllDirty]);
	
	const SERVER_SHARED_DAILY = ["freeShopPurchase", "gemTreasureChest"] as const;
	type ServerSharedDailyField = (typeof SERVER_SHARED_DAILY)[number];
	const isServerSharedDailyField = (field?:string):field is ServerSharedDailyField => {
		return !!field && (SERVER_SHARED_DAILY as readonly string[]).includes(field);
	};
	
	const handleTodoChange = (
		characterId:number,
		todoData:TodoData,
		changedField?:string,
		options?:{saveDebounceMs?:number; saveStrategy?:AutoSaveStrategy}
	) => {
		const currentTodos = todosRef.current;
		const saveDebounceMs = options?.saveDebounceMs ?? AUTO_SAVE_DEBOUNCE_MS;
		const saveStrategy = options?.saveStrategy ?? "debounce";
		if(isServerSharedDailyField(changedField)){
			const serverId = currentTodos.find(t => t.characterId === characterId)?.serverId;
			if(serverId != null){
				const fieldValue = todoData.daily[changedField];
				const nextTodos = currentTodos.map(t => {
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
				});
				todosRef.current = nextTodos;
				setTodos(nextTodos);
				const affectedIds = currentTodos.filter(t => t.serverId === serverId).map(t => t.characterId);
				affectedIds.forEach(id => dirtyRef.current.add(id));
				setIsDirty(true);
				scheduleAutoSave({debounceMs : saveDebounceMs, strategy : saveStrategy});
				return;
			}
		}
		const nextTodos = currentTodos.map(t =>
			t.characterId === characterId ? {...t, todoData} : t
		);
		todosRef.current = nextTodos;
		setTodos(nextTodos);
		dirtyRef.current.add(characterId);
		setIsDirty(true);
		scheduleAutoSave({debounceMs : saveDebounceMs, strategy : saveStrategy});
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

	const favoriteItemIdSet = useMemo(
		() => new Set(favoriteItems.map(item => item.itemId)),
		[favoriteItems]
	);

	const filteredFavoriteCandidates = useMemo(
		() => favoriteCandidates.filter(item => !favoriteItemIdSet.has(item.itemId)),
		[favoriteCandidates, favoriteItemIdSet]
	);

	const handleAddFavoriteItem = (item:GameItemSummary) => {
		setFavoriteItems(prev => {
			if(prev.some(favorite => favorite.itemId === item.itemId)){
				return prev;
			}
			return [
				...prev,
				{
					itemId : item.itemId,
					itemName : item.itemName,
					itemType : item.itemType,
					itemRarity : item.itemRarity
				}
			];
		});
		setFavoriteSearchInput("");
		setFavoriteKeyword("");
		setFavoriteCandidates([]);
	};

	const handleRemoveFavoriteItem = (itemId:number) => {
		setFavoriteItems(prev => prev.filter(item => item.itemId !== itemId));
	};

	const moveSelectedCharacter = useCallback(async(direction:1 | -1) => {
		if(todos.length <= 1){
			return;
		}
		const currentIndex = todos.findIndex(todo => todo.characterId === selectedCharacterId);
		if(currentIndex < 0){
			await handleSelectCharacter(todos[0].characterId);
			return;
		}
		const nextIndex = (currentIndex + direction + todos.length) % todos.length;
		await handleSelectCharacter(todos[nextIndex].characterId);
	}, [todos, selectedCharacterId, handleSelectCharacter]);

	useEffect(() => {
		if(todos.length <= 1){
			return;
		}
		const handleKeyDown = (event:KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			if(target){
				const tag = target.tagName;
				if(target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON"){
					return;
				}
			}
			if(event.key === "ArrowLeft"){
				event.preventDefault();
				void moveSelectedCharacter(-1);
			}else if(event.key === "ArrowRight"){
				event.preventDefault();
				void moveSelectedCharacter(1);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [todos.length, moveSelectedCharacter]);

	const handleCharacterSwipeStart = (event:React.TouchEvent<HTMLDivElement>) => {
		if(todos.length <= 1){
			return;
		}
		const touch = event.changedTouches[0];
		touchStartXRef.current = touch.clientX;
		touchStartYRef.current = touch.clientY;
		touchStartTimeRef.current = Date.now();
	};

	const handleCharacterSwipeEnd = (event:React.TouchEvent<HTMLDivElement>) => {
		if(todos.length <= 1 || touchStartXRef.current == null || touchStartYRef.current == null){
			return;
		}
		const touch = event.changedTouches[0];
		const dx = touch.clientX - touchStartXRef.current;
		const dy = touch.clientY - touchStartYRef.current;
		const elapsed = Date.now() - touchStartTimeRef.current;
		touchStartXRef.current = null;
		touchStartYRef.current = null;
		if(elapsed > 700){
			return;
		}
		if(Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy)){
			return;
		}
		if(dx < 0){
			void moveSelectedCharacter(1);
		}else{
			void moveSelectedCharacter(-1);
		}
	};
	
	const selectedTodo = todos.find(t => t.characterId === selectedCharacterId);
	
	return (
		<div className={styles.todoPage}>
			<div className={styles.container}>
			<div className={styles.pageHeader}>
				<div className="page-heading">
					<h1 className={styles.pageTitle}>숙제 관리</h1>
					<p className={styles.pageSubtitle}>캐릭터별 일일/주간 진행도를 체크하고 이벤트 일정을 관리하세요</p>
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
			
			{error ? (
				<div className={styles.error}>{error}</div>
			) : loading ? null : todos.length === 0 && !showAddCharacter ? (
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
									onClick={() => void handleSelectCharacter(todo.characterId)}
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
						<div
							className={styles.characterView}
							onTouchStart={handleCharacterSwipeStart}
							onTouchEnd={handleCharacterSwipeEnd}
						>
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
										favoriteItems={favoriteItems}
										dailyMemos={selectedTodo.todoData.dailyMemos}
										onChange={(daily, changedField) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											daily
										}, changedField, {
											saveDebounceMs : HOMEWORK_SAVE_DEBOUNCE_MS,
											saveStrategy : "leadingTrailingThrottle"
										})}
										onSettingsChange={(settings) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											settings
										})}
										onMemosChange={(memos) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											dailyMemos : memos
										}, undefined, {
											saveDebounceMs : HOMEWORK_SAVE_DEBOUNCE_MS,
											saveStrategy : "leadingTrailingThrottle"
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
										favoriteItems={favoriteItems}
										weeklyMemos={selectedTodo.todoData.weeklyMemos}
										onChange={(weekly) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											weekly
										}, undefined, {
											saveDebounceMs : HOMEWORK_SAVE_DEBOUNCE_MS,
											saveStrategy : "leadingTrailingThrottle"
										})}
										onSettingsChange={(settings) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											settings
										})}
										onMemosChange={(memos) => handleTodoChange(selectedTodo.characterId, {
											...selectedTodo.todoData,
											weeklyMemos : memos
										}, undefined, {
											saveDebounceMs : HOMEWORK_SAVE_DEBOUNCE_MS,
											saveStrategy : "leadingTrailingThrottle"
										})}
									/>
								</div>
							</div>
						</div>
					)}

					<div className={styles.favoriteSection}>
						<div className={styles.favoriteHeader}>
							<h4>아이템 즐겨찾기</h4>
							<span className={styles.favoriteCount}>{favoriteItems.length}개</span>
						</div>
						<div className={styles.favoriteSearch}>
							<input
								type="text"
								placeholder="즐겨찾기에 추가할 아이템 검색..."
								value={favoriteSearchInput}
								onChange={(e) => setFavoriteSearchInput(e.target.value)}
							/>
							{favoriteLoading && <span className={styles.favoriteSearchState}>검색 중...</span>}
						</div>

						{favoriteKeyword && !favoriteLoading && filteredFavoriteCandidates.length === 0 && (
							<div className={styles.favoriteSearchEmpty}>검색 결과가 없습니다.</div>
						)}

						{filteredFavoriteCandidates.length > 0 && (
							<div className={styles.favoriteSearchResults}>
								{filteredFavoriteCandidates.map(item => (
									<button
										key={item.itemId}
										type="button"
										className={styles.favoriteSearchItem}
										onClick={() => handleAddFavoriteItem(item)}
									>
										<div className={styles.favoriteSearchItemInfo}>
											<span className={styles.favoriteSearchName}>{item.itemName}</span>
											<span className={styles.favoriteSearchMeta}>
												{[item.itemType, item.itemRarity].filter(Boolean).join(" / ")}
											</span>
										</div>
										<Plus size={14}/>
									</button>
								))}
							</div>
						)}

						{favoriteItems.length > 0 ? (
							<div className={styles.favoriteList}>
								{favoriteItems.map(item => (
									<div key={item.itemId} className={styles.favoriteCard}>
										<div className={styles.favoriteCardInfo}>
											<span className={styles.favoriteCardName}>{item.itemName}</span>
											<span className={styles.favoriteCardMeta}>
												{[item.itemType, item.itemRarity].filter(Boolean).join(" / ") || "-"}
											</span>
										</div>
										<div className={styles.favoriteCardActions}>
											<button
												type="button"
												className={styles.favoriteInfoBtn}
												onClick={() => setSelectedFavoriteItem({
													itemId : item.itemId,
													itemName : item.itemName,
													itemType : item.itemType,
													itemRarity : item.itemRarity
												})}
												aria-label={`${item.itemName} 정보 보기`}
											>
												<Info size={14}/>
											</button>
											<button
												type="button"
												className={styles.favoriteRemoveBtn}
												onClick={() => handleRemoveFavoriteItem(item.itemId)}
												aria-label={`${item.itemName} 제거`}
											>
												<X size={14}/>
											</button>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className={styles.favoriteEmpty}>
								즐겨찾기 아이템을 추가하면 물물교환 아이템 설정에서 추천 목록으로 표시됩니다.
							</div>
						)}
					</div>

					{selectedFavoriteItem && (
						<ItemDetailModal
							item={selectedFavoriteItem}
							onClose={() => setSelectedFavoriteItem(null)}
						/>
					)}
					
					<EventChecklist/>
				</>
			)}
			</div>
		</div>
	);
};

export default TodoPage;
