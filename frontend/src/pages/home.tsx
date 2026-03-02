import React, {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {
	ArrowRight,
	RefreshCw
} from "lucide-react";
import {boardService, eventService, noticeService, photoBoardService, todoService} from "@/services";
import type {BoardPost, GameEvent, GameNotice, PhotoBoardPost, UserTodo} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {useSeo} from "@/hooks/use-seo";
import {createBoardPostPath} from "@/utils/board-url";
import styles from "./home.module.scss";

type HomeworkProgress = {
	done:number;
	total:number;
};

type HomeworkSummaryItem = {
	key:string;
	label:string;
	progress:HomeworkProgress;
};

type CharacterHomeworkSummary = {
	characterId:number;
	characterName:string;
	serverName:string | null;
	className:string | null;
	dailyItems:HomeworkSummaryItem[];
	weeklyItems:HomeworkSummaryItem[];
	daily:HomeworkProgress;
	weekly:HomeworkProgress;
	overall:HomeworkProgress;
};

type NoticeFeedTab = "all" | "notice" | "updateNote" | "erinNote" | "maintenanceInProgress" | "maintenanceCompleted";
type EventFeedTab = "endingSoon" | "all";

const NOTICE_FEED_TABS:Array<{key:NoticeFeedTab; label:string}> = [
	{key : "all", label : "전체"},
	{key : "notice", label : "공지"},
	{key : "updateNote", label : "업데이트 노트"},
	{key : "erinNote", label : "에린 노트"},
	{key : "maintenanceInProgress", label : "점검"},
	{key : "maintenanceCompleted", label : "점검 완료"}
];

const EVENT_FEED_TABS:Array<{key:EventFeedTab; label:string}> = [
	{key : "endingSoon", label : "마감 임박"},
	{key : "all", label : "전체"}
];

/**
 * Constant SUMMONING_BARRIER_MAX.
 */
const SUMMONING_BARRIER_MAX = 7;
/**
 * Constant BLACK_HOLE_TOTAL.
 */
const BLACK_HOLE_TOTAL = 14;
/**
 * Constant ABYSS_REWARD_DEFAULT_MAX.
 */
const ABYSS_REWARD_DEFAULT_MAX = 4;
/**
 * Constant VANGUARD_REWARD_MAX.
 */
const VANGUARD_REWARD_MAX = 3;
/**
 * Constant KST_OFFSET_MINUTES.
 */
const KST_OFFSET_MINUTES = 9 * 60;
/**
 * Utility function ABYSS_HOLE_CYCLE_MS.
 */
const ABYSS_HOLE_CYCLE_MS = ((36 * 60) + 15) * 60 * 1000;
/**
 * Constant ABYSS_HOLE_ANCHOR_KST_ISO.
 */
const ABYSS_HOLE_ANCHOR_KST_ISO = "2026-02-23T15:39:52+09:00";

/**
 * Utility function createFallbackWeeklyTasks.
 */
const createFallbackWeeklyTasks = () => ({
	summoningBarrier : 0,
	blackHole : 0,
	phantomTower : {floor : 0, stage : 0},
	fieldBoss : {completed : [], tracked : []},
	abyss : {completed : [], tracked : []},
	abyssReward : 0,
	abyssRewardMax : ABYSS_REWARD_DEFAULT_MAX,
	raid : {completed : [], tracked : []},
	vanguard : {reward : 0, emergency : 0, quest : false}
});

/**
 * Utility function toDateTime.
 */
const toDateTime = (value:string | null | undefined):number => {
	if(!value){
		return 0;
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

/**
 * Utility function formatDate.
 */
const formatDate = (value:string | null | undefined):string => {
	if(!value){
		return "날짜 미정";
	}
	const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if(matched){
		return `${matched[1]}.${matched[2]}.${matched[3]}`;
	}
	const parsed = new Date(value);
	if(Number.isNaN(parsed.getTime())){
		return value;
	}
	return `${parsed.getFullYear()}.${String(parsed.getMonth() + 1).padStart(2, "0")}.${String(parsed.getDate()).padStart(2, "0")}`;
};

/**
 * Utility function getNoticeTypeLabel.
 */
const getNoticeTypeLabel = (noticeType:string) => {
	switch(noticeType){
		case "maintenanceInProgress":
			return "점검 진행";
		case "maintenanceCompleted":
			return "점검 완료";
		case "updateNote":
			return "업데이트 노트";
		case "erinNote":
			return "에린 노트";
		default:
			return "공지";
	}
};

/**
 * Utility function matchesNoticeTab.
 */
const matchesNoticeTab = (noticeType:string, tab:NoticeFeedTab):boolean => {
	if(tab === "all"){
		return true;
	}
	if(tab === "notice"){
		return !["updateNote", "erinNote", "maintenanceInProgress", "maintenanceCompleted"].includes(noticeType);
	}
	return noticeType === tab;
};

/**
 * Utility function getEventDeadlineLabel.
 */
const getEventDeadlineLabel = (event:GameEvent):string => {
	if(event.daysLeft <= 0){
		return "오늘 마감";
	}
	return `마감 D-${event.daysLeft}`;
};

/**
 * Utility function getKstDate.
 */
const getKstDate = (base:Date = new Date()):Date => {
	const utc = base.getTime() + base.getTimezoneOffset() * 60000;
	return new Date(utc + KST_OFFSET_MINUTES * 60000);
};

/**
 * Utility function getNextKstMinuteMarkInfo.
 */
const getNextKstMinuteMarkInfo = (minuteMark:number, base:Date = new Date()) => {
	const kstNow = getKstDate(base);
	const next = new Date(kstNow);
	next.setMinutes(minuteMark, 0, 0);
	if(next.getTime() <= kstNow.getTime()){
		next.setHours(next.getHours() + 1);
	}
	return {
		remainingMs : Math.max(0, next.getTime() - kstNow.getTime()),
		nextHour : next.getHours(),
		nextMinute : next.getMinutes()
	};
};

/**
 * Utility function getNextRecurringScheduleInfo.
 */
const getNextRecurringScheduleInfo = (anchorIso:string, cycleMs:number, base:Date = new Date()) => {
	const anchor = new Date(anchorIso);
	const now = base.getTime();
	const anchorMs = anchor.getTime();
	if(Number.isNaN(anchorMs) || cycleMs <= 0){
		const fallback = getKstDate(base);
		return {
			remainingMs : 0,
			nextKstDate : fallback,
			nextHour : fallback.getHours(),
			nextMinute : fallback.getMinutes()
		};
	}

	const diff = now - anchorMs;
	/**
	 * Utility function normalizedRemainder.
	 */
	const normalizedRemainder = ((diff % cycleMs) + cycleMs) % cycleMs;
	const offset = normalizedRemainder === 0 ? 0 : (cycleMs - normalizedRemainder);
	const nextUtcDate = new Date(now + offset);
	const nextKstDate = getKstDate(nextUtcDate);
	return {
		remainingMs : offset,
		nextKstDate,
		nextHour : nextKstDate.getHours(),
		nextMinute : nextKstDate.getMinutes()
	};
};

/**
 * Utility function formatRemainingTime.
 */
const formatRemainingTime = (remainingMs:number):string => {
	const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	if(hours > 0){
		return `${hours}시간 ${String(minutes).padStart(2, "0")}분 ${String(seconds).padStart(2, "0")}초`;
	}
	return `${String(minutes).padStart(2, "0")}분 ${String(seconds).padStart(2, "0")}초`;
};

/**
 * Utility function formatKstClock.
 */
const formatKstClock = (hour:number, minute:number):string =>
	`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

/**
 * Utility function formatKstMonthDayClock.
 */
const formatKstMonthDayClock = (kstDate:Date):string =>
	`${String(kstDate.getMonth() + 1).padStart(2, "0")}.${String(kstDate.getDate()).padStart(2, "0")} ${formatKstClock(kstDate.getHours(), kstDate.getMinutes())}`;

/**
 * Utility function getNoticeLink.
 */
const getNoticeLink = (noticeType:string, noticeId:string) => {
	switch(noticeType){
		case "updateNote":
			return `https://mabinogimobile.nexon.com/News/UpdateNote/${noticeId}`;
		case "erinNote":
			return `https://mabinogimobile.nexon.com/News/ErinNote/${noticeId}`;
		default:
			return `https://mabinogimobile.nexon.com/News/Notice/${noticeId}`;
	}
};

/**
 * Utility function getBoardFeedCategoryLabel.
 */
const getBoardFeedCategoryLabel = (post:BoardPost):string => {
	if(post.categoryName?.trim()){
		return post.categoryName.trim();
	}
	return "General";
};

/**
 * Utility function getGalleryAuthor.
 */
const getGalleryAuthor = (post:PhotoBoardPost):string =>
	post.authorNickname?.trim() || "Anonymous";

/**
 * Utility function getGalleryTitle.
 */
const getGalleryTitle = (post:PhotoBoardPost):string => {
	const title = post.title?.trim();
	if(!title || title.toLowerCase() === "image"){
		return "이미지";
	}
	return title;
};

/**
 * Utility function getGalleryImageUrl.
 */
const getGalleryImageUrl = (post:PhotoBoardPost):string => {
	/**
	 * Utility function normalized.
	 */
	const normalized = (post.imageUrls ?? [])
		.map((url) => (url ?? "").trim())
		.filter((url) => url.length > 0);
	return normalized[0] || "";
};

/**
 * Utility function formatProgress.
 */
const formatProgress = (done:number, total:number):string => {
	if(total === 0){
		return "-";
	}
	return `${done}/${total}`;
};

/**
 * Utility function toPercent.
 */
const toPercent = (done:number, total:number):number => {
	if(total <= 0){
		return 0;
	}
	return Math.min(100, Math.round((done / total) * 100));
};

/**
 * Utility function getProgressTone.
 */
const getProgressTone = (progress:HomeworkProgress):"complete" | "active" | "idle" => {
	if(progress.total === 0){
		return "idle";
	}
	if(progress.done >= progress.total){
		return "complete";
	}
	if(progress.done > 0){
		return "active";
	}
	return "idle";
};

/**
 * Utility function getProgressLabel.
 */
const getProgressLabel = (progress:HomeworkProgress):string => {
	if(progress.total === 0){
		return "미설정";
	}
	if(progress.done >= progress.total){
		return "완료";
	}
	if(progress.done > 0){
		return "진행";
	}
	return "대기";
};

/**
 * Utility function normalizeAbyssCompletedSlots.
 */
const normalizeAbyssCompletedSlots = (completed:number[] = [], tracked:number[] = []):number[] => {
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
};

/**
 * Constant DAILY_TASK_KEYS.
 */
const DAILY_TASK_KEYS = ["dayDungeon", "cashShop", "barter"] as const;
/**
 * Constant WEEKLY_TASK_KEYS.
 */
const WEEKLY_TASK_KEYS = ["summoningBarrier", "blackHole", "fieldBoss", "abyssReward", "raid", "vanguard", "barter"] as const;

/**
 * Utility function getHiddenTaskSet.
 */
const getHiddenTaskSet = (todo:UserTodo):Set<string> => new Set(todo.todoData.settings?.hiddenTasks ?? []);

/**
 * Utility function getCashShopCompletedCount.
 */
const getCashShopCompletedCount = (todo:UserTodo):number => {
	const daily = todo.todoData.daily ?? {};
	return Number(Boolean(daily.freeShopPurchase)) + Number(Boolean(daily.gemTreasureChest));
};

/**
 * Utility function getDailyChecklistProgress.
 */
const getDailyChecklistProgress = (todo:UserTodo):HomeworkProgress => {
	const daily = todo.todoData.daily ?? {};
	const dailyMemos = todo.todoData.dailyMemos ?? [];
	const hiddenTasks = getHiddenTaskSet(todo);

	let done = 0;
	let total = 0;

	for(const taskKey of DAILY_TASK_KEYS){
		if(hiddenTasks.has(taskKey)){
			continue;
		}
		if(taskKey === "dayDungeon"){
			total += 1;
			if(Boolean(daily.dayDungeon)){
				done += 1;
			}
			continue;
		}
		if(taskKey === "cashShop"){
			total += 2;
			done += getCashShopCompletedCount(todo);
		}
	}

	for(const memo of dailyMemos){
		if(hiddenTasks.has(`memo_${memo.id}`)){
			continue;
		}
		total += 1;
		if(memo.completed){
			done += 1;
		}
	}

	return {done, total};
};

/**
 * Utility function getWeeklyTasks.
 */
const getWeeklyTasks = (todo:UserTodo) => todo.todoData.weekly ?? createFallbackWeeklyTasks();

/**
 * Utility function getWeeklyChecklistProgress.
 */
const getWeeklyChecklistProgress = (todo:UserTodo):HomeworkProgress => {
	const weekly = getWeeklyTasks(todo);
	const weeklyMemos = todo.todoData.weeklyMemos ?? [];
	const hiddenTasks = getHiddenTaskSet(todo);
	const abyssRewardMax = weekly.abyssRewardMax ?? ABYSS_REWARD_DEFAULT_MAX;

	const fieldTracked = weekly.fieldBoss?.tracked ?? [];
	const fieldCompleted = weekly.fieldBoss?.completed ?? [];
	const fieldTarget = Math.min(fieldTracked.length, abyssRewardMax);

	const abyssTracked = weekly.abyss?.tracked ?? [];
	const abyssCompleted = weekly.abyss?.completed ?? [];
	const abyssDone = abyssTracked.length > 0
		? Math.min(normalizeAbyssCompletedSlots(abyssCompleted, abyssTracked).length, abyssRewardMax)
		: Math.min(Math.max(weekly.abyssReward ?? 0, 0), abyssRewardMax);

	const raidTrackedUniqueCount = new Set(weekly.raid?.tracked ?? []).size;
	const raidDone = Math.min(weekly.raid?.completed?.length ?? 0, raidTrackedUniqueCount);

	let done = 0;
	let total = 0;

	for(const taskKey of WEEKLY_TASK_KEYS){
		if(hiddenTasks.has(taskKey)){
			continue;
		}
		switch(taskKey){
			case "summoningBarrier":
				total += 1;
				if((weekly.summoningBarrier ?? 0) >= SUMMONING_BARRIER_MAX){
					done += 1;
				}
				break;
			case "blackHole":
				total += 1;
				if((weekly.blackHole ?? 0) >= BLACK_HOLE_TOTAL){
					done += 1;
				}
				break;
			case "fieldBoss":
				total += 1;
				if(fieldTracked.length > 0 && fieldCompleted.length >= fieldTarget){
					done += 1;
				}
				break;
			case "abyssReward":
				total += 1;
				if(abyssDone >= abyssRewardMax){
					done += 1;
				}
				break;
			case "raid":
				total += 1;
				if(raidTrackedUniqueCount > 0 && raidDone >= raidTrackedUniqueCount){
					done += 1;
				}
				break;
			case "vanguard":
				total += 1;
				if((weekly.vanguard?.reward ?? 0) >= VANGUARD_REWARD_MAX){
					done += 1;
				}
				break;
			case "barter":
				break;
			default:
				break;
		}
	}

	for(const memo of weeklyMemos){
		if(hiddenTasks.has(`memo_${memo.id}`)){
			continue;
		}
		total += 1;
		if(memo.completed){
			done += 1;
		}
	}

	return {done, total};
};

/**
 * Utility function buildCharacterHomework.
 */
const buildCharacterHomework = (todo:UserTodo):CharacterHomeworkSummary => {
	const daily = todo.todoData.daily ?? {};
	const weekly = getWeeklyTasks(todo);

	const dayDungeonProgress:HomeworkProgress = {done : daily.dayDungeon ? 1 : 0, total : 1};
	const cashShopProgress:HomeworkProgress = {done : getCashShopCompletedCount(todo), total : 2};

	const summoningDone = Math.max(0, Math.min(weekly.summoningBarrier ?? 0, SUMMONING_BARRIER_MAX));
	const blackHoleDone = Math.max(0, Math.min(weekly.blackHole ?? 0, BLACK_HOLE_TOTAL));
	const abyssRewardMax = weekly.abyssRewardMax ?? ABYSS_REWARD_DEFAULT_MAX;

	const fieldTracked = weekly.fieldBoss?.tracked ?? [];
	const fieldCompleted = weekly.fieldBoss?.completed ?? [];
	const fieldTarget = Math.min(fieldTracked.length, abyssRewardMax);
	const fieldDone = Math.min(fieldCompleted.length, fieldTarget);

	const abyssTracked = weekly.abyss?.tracked ?? [];
	const abyssCompleted = weekly.abyss?.completed ?? [];
	const abyssDone = abyssTracked.length > 0
		? Math.min(normalizeAbyssCompletedSlots(abyssCompleted, abyssTracked).length, abyssRewardMax)
		: Math.min(Math.max(weekly.abyssReward ?? 0, 0), abyssRewardMax);

	const raidTrackedUniqueCount = new Set(weekly.raid?.tracked ?? []).size;
	const raidDone = Math.min(weekly.raid?.completed?.length ?? 0, raidTrackedUniqueCount);

	const vanguardDone = Math.max(0, Math.min(weekly.vanguard?.reward ?? 0, VANGUARD_REWARD_MAX));

	const dailyItems:HomeworkSummaryItem[] = [
		{key : "dayDungeon", label : "요일 던전 여부", progress : dayDungeonProgress},
		{key : "cashShop", label : "캐시샵", progress : cashShopProgress}
	];

	const weeklyItems:HomeworkSummaryItem[] = [
		{key : "summoningBarrier", label : "소환의 결계", progress : {done : summoningDone, total : SUMMONING_BARRIER_MAX}},
		{key : "blackHole", label : "검은 구멍", progress : {done : blackHoleDone, total : BLACK_HOLE_TOTAL}},
		{key : "fieldBoss", label : "필드 보스", progress : {done : fieldDone, total : fieldTarget}},
		{key : "abyss", label : "어비스", progress : {done : abyssDone, total : abyssRewardMax}},
		{key : "raid", label : "레이드", progress : {done : raidDone, total : raidTrackedUniqueCount}},
		{key : "vanguard", label : "뱅가드 횟수", progress : {done : vanguardDone, total : VANGUARD_REWARD_MAX}}
	];

	const dailyChecklistProgress = getDailyChecklistProgress(todo);
	const weeklyChecklistProgress = getWeeklyChecklistProgress(todo);

	return {
		characterId : todo.characterId,
		characterName : todo.characterName,
		serverName : todo.serverName ?? null,
		className : todo.className ?? null,
		dailyItems,
		weeklyItems,
		daily : dailyChecklistProgress,
		weekly : weeklyChecklistProgress,
		overall : {
			done : dailyChecklistProgress.done + weeklyChecklistProgress.done,
			total : dailyChecklistProgress.total + weeklyChecklistProgress.total
		}
	};
};

const HomePage:React.FC = () => {
	const navigate = useNavigate();
	const {user} = useAuth();

	useSeo({
		title : "홈",
		description : "Sexynogi 메인에서 최신 공지, 이벤트, 개인 숙제 현황을 확인하세요.",
		canonicalPath : "/"
	});

	const [allNotices, setAllNotices] = useState<GameNotice[]>([]);
	const [timedEvents, setTimedEvents] = useState<GameEvent[]>([]);
	const [latestBoardPosts, setLatestBoardPosts] = useState<BoardPost[]>([]);
	const [latestGalleryPosts, setLatestGalleryPosts] = useState<PhotoBoardPost[]>([]);
	const [selectedNoticeTab, setSelectedNoticeTab] = useState<NoticeFeedTab>("all");
	const [selectedEventTab, setSelectedEventTab] = useState<EventFeedTab>("endingSoon");
	const [feedLoading, setFeedLoading] = useState(true);
	const [feedError, setFeedError] = useState<string | null>(null);
	const [homeworkTodos, setHomeworkTodos] = useState<UserTodo[]>([]);
	const [homeworkLoading, setHomeworkLoading] = useState(false);
	const [homeworkError, setHomeworkError] = useState<string | null>(null);
	const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
	const [clockTick, setClockTick] = useState(() => Date.now());

	useEffect(() => {
		const timer = window.setInterval(() => {
			setClockTick(Date.now());
		}, 1000);
		return () => window.clearInterval(timer);
	}, []);

	useEffect(() => {
		/**
		 * Utility function fetchHomeFeeds.
		 */
		const fetchHomeFeeds = async() => {
			setFeedLoading(true);
			setFeedError(null);

			const [noticeResult, eventResult, boardResult, galleryResult] = await Promise.allSettled([
				noticeService.getNotices(),
				eventService.getActiveEvents(),
				boardService.getPosts(0, 4),
				photoBoardService.getPosts(0, 3)
			]);

			const errors:string[] = [];

			if(noticeResult.status === "fulfilled"){
				const sortedNotices = [...noticeResult.value]
					.sort((a, b) => toDateTime(b.publishedDate) - toDateTime(a.publishedDate));
				setAllNotices(sortedNotices);
			}else{
				errors.push("게임 소식");
				setAllNotices([]);
			}

			if(eventResult.status === "fulfilled"){
				const filteredEvents = eventResult.value
					.filter((event) => !event.permanent)
					.sort((a, b) => toDateTime(a.endDate) - toDateTime(b.endDate));
				setTimedEvents(filteredEvents);
			}else{
				errors.push("이벤트");
				setTimedEvents([]);
			}

			if(boardResult.status === "fulfilled"){
				setLatestBoardPosts(boardResult.value.content);
			}else{
				errors.push("게시판");
				setLatestBoardPosts([]);
			}

			if(galleryResult.status === "fulfilled"){
				setLatestGalleryPosts(galleryResult.value.content);
			}else{
				errors.push("갤러리");
				setLatestGalleryPosts([]);
			}

			if(errors.length > 0){
				setFeedError(`${errors.join(", ")} 데이터를 불러오지 못했습니다.`);
			}

			setFeedLoading(false);
		};

		void fetchHomeFeeds();
	}, []);

	useEffect(() => {
		if(!user){
			setHomeworkTodos([]);
			setHomeworkError(null);
			setHomeworkLoading(false);
			setSelectedCharacterId(null);
			return;
		}

		let active = true;

		/**
		 * Utility function fetchHomeworkSummary.
		 */
		const fetchHomeworkSummary = async() => {
			setHomeworkLoading(true);
			setHomeworkError(null);
			try{
				const todos = await todoService.getTodos();
				if(!active){
					return;
				}
				setHomeworkTodos(todos);
			}catch{
				if(!active){
					return;
				}
				setHomeworkTodos([]);
				setHomeworkError("숙제 요약 정보를 불러오지 못했습니다.");
			}finally{
				if(active){
					setHomeworkLoading(false);
				}
			}
		};

		void fetchHomeworkSummary();
		return () => {
			active = false;
		};
	}, [user]);

	const endingSoonEvents = useMemo(
		() => timedEvents.filter((event) => event.endingSoon),
		[timedEvents]
	);

	const endingSoonEventIds = useMemo(
		() => new Set(endingSoonEvents.map((event) => event.eventId)),
		[endingSoonEvents]
	);

	const filteredNotices = useMemo(
		() => allNotices.filter((notice) => matchesNoticeTab(notice.noticeType, selectedNoticeTab)),
		[allNotices, selectedNoticeTab]
	);

	const visibleNotices = useMemo(
		() => filteredNotices.slice(0, 8),
		[filteredNotices]
	);

	const filteredEvents = useMemo(
		() => selectedEventTab === "endingSoon" ? endingSoonEvents : timedEvents,
		[selectedEventTab, endingSoonEvents, timedEvents]
	);

	const summoningBarrierSpawnTimer = useMemo(
		() => getNextKstMinuteMarkInfo(0, new Date(clockTick)),
		[clockTick]
	);

	const abyssHoleSpawnTimer = useMemo(
		() => getNextRecurringScheduleInfo(ABYSS_HOLE_ANCHOR_KST_ISO, ABYSS_HOLE_CYCLE_MS, new Date(clockTick)),
		[clockTick]
	);

	const characterHomeworkItems = useMemo(
		() => homeworkTodos.map((todo) => buildCharacterHomework(todo)),
		[homeworkTodos]
	);

	useEffect(() => {
		if(characterHomeworkItems.length === 0){
			setSelectedCharacterId(null);
			return;
		}
		const stillExists = selectedCharacterId !== null
			&& characterHomeworkItems.some((item) => item.characterId === selectedCharacterId);
		if(!stillExists){
			setSelectedCharacterId(characterHomeworkItems[0].characterId);
		}
	}, [characterHomeworkItems, selectedCharacterId]);

	const selectedCharacterSummary = useMemo(() => {
		if(selectedCharacterId === null){
			return null;
		}
		return characterHomeworkItems.find((item) => item.characterId === selectedCharacterId) ?? null;
	}, [characterHomeworkItems, selectedCharacterId]);

	/**
	 * Utility function handleMoveToTodo.
	 */
	const handleMoveToTodo = () => {
		if(!user){
			navigate("/login");
			return;
		}
		if(selectedCharacterId){
			navigate(`/todo?characterId=${selectedCharacterId}`);
			return;
		}
		navigate("/todo");
	};

	/**
	 * Utility function handleOpenBoardPost.
	 */
	const handleOpenBoardPost = (post:BoardPost) => {
		navigate(createBoardPostPath(post.title), {state : {postId : post.postId}});
	};

	/**
	 * Utility function handleOpenGalleryPost.
	 */
	const handleOpenGalleryPost = (_post:PhotoBoardPost) => {
		navigate("/gallery");
	};

	return (
		<div className={`home-page ${styles.homePage}`}>
			<div className={styles.container}>
				<section className={styles.heroSection}>
					<article className={styles.todayStatusCard}>
						<div className={styles.todayStatusHeader}>
							<div className={styles.todayStatusHeaderTitle}>
								<h2>캐릭터별 숙제 요약</h2>
								{user && <span>{characterHomeworkItems.length}개 캐릭터</span>}
							</div>
							<button
								type="button"
								className={`${styles.primaryAction} ${styles.headerActionBtn}`}
								onClick={handleMoveToTodo}
							>
								숙제 페이지
								<ArrowRight size={16}/>
							</button>
						</div>
						{homeworkError && <div className={styles.homeworkAlert}>{homeworkError}</div>}
						{!user ? (
							<p className={styles.todayStatusMessage}>로그인하면 캐릭터별 숙제 진행률을 확인할 수 있습니다.</p>
						) : homeworkLoading ? (
							<p className={styles.todayStatusMessage}>캐릭터별 숙제 진행 현황을 불러오는 중입니다.</p>
						) : characterHomeworkItems.length === 0 ? (
							<p className={styles.todayStatusMessage}>등록된 캐릭터가 없습니다. 숙제 페이지에서 캐릭터를 추가해 주세요.</p>
						) : (
							<>
								<div className={styles.characterMenu}>
									{characterHomeworkItems.map((item) => (
										<button
											key={item.characterId}
											type="button"
											className={`${styles.characterMenuBtn} ${selectedCharacterId === item.characterId ? styles.activeCharacterMenuBtn : ""}`}
											onClick={() => setSelectedCharacterId(item.characterId)}
										>
											{item.characterName}
										</button>
									))}
								</div>

								{selectedCharacterSummary && (
									<div className={styles.selectedCharacterPanel}>
										<div className={styles.characterStatusTop}>
											<strong>{selectedCharacterSummary.characterName}</strong>
											<span className={styles.characterStatusBadge} data-tone={getProgressTone(selectedCharacterSummary.overall)}>
												전체 {formatProgress(selectedCharacterSummary.overall.done, selectedCharacterSummary.overall.total)}
											</span>
										</div>
										<div className={styles.characterStatusMeta}>
											{[selectedCharacterSummary.serverName, selectedCharacterSummary.className].filter(Boolean).join(" · ") || "서버/직업 정보 없음"}
										</div>

										<div className={styles.homeworkSummaryGrid}>
											<section className={`${styles.summaryPanel} ${styles.dailySummaryPanel}`}>
												<div className={styles.summaryPanelHeader}>
													<h3>일일 숙제</h3>
													<span>{formatProgress(selectedCharacterSummary.daily.done, selectedCharacterSummary.daily.total)}</span>
												</div>
												<div className={`${styles.summaryList} ${styles.summaryListDaily}`}>
													{selectedCharacterSummary.dailyItems.map((item) => {
														const percent = toPercent(item.progress.done, item.progress.total);
														return (
															<div key={`daily-${selectedCharacterSummary.characterId}-${item.key}`} className={styles.summaryItem}>
																<div className={styles.summaryItemTop}>
																	<span className={styles.summaryLabel}>{item.label}</span>
																	<strong className={styles.summaryValue}>{formatProgress(item.progress.done, item.progress.total)}</strong>
																</div>
																<div className={styles.summaryTrack}>
																	<span style={{width : `${percent}%`}}/>
																</div>
																<div className={styles.summaryMeta}>
																	<span>{percent}%</span>
																	<span className={styles.summaryState} data-tone={getProgressTone(item.progress)}>{getProgressLabel(item.progress)}</span>
																</div>
															</div>
														);
													})}
												</div>
											</section>

											<section className={`${styles.summaryPanel} ${styles.weeklySummaryPanel}`}>
												<div className={styles.summaryPanelHeader}>
													<h3>주간 숙제</h3>
													<span>{formatProgress(selectedCharacterSummary.weekly.done, selectedCharacterSummary.weekly.total)}</span>
												</div>
												<div className={`${styles.summaryList} ${styles.summaryListWeekly}`}>
													{selectedCharacterSummary.weeklyItems.map((item) => {
														const percent = toPercent(item.progress.done, item.progress.total);
														return (
															<div key={`weekly-${selectedCharacterSummary.characterId}-${item.key}`} className={styles.summaryItem}>
																<div className={styles.summaryItemTop}>
																	<span className={styles.summaryLabel}>{item.label}</span>
																	<strong className={styles.summaryValue}>{formatProgress(item.progress.done, item.progress.total)}</strong>
																</div>
																<div className={styles.summaryTrack}>
																	<span style={{width : `${percent}%`}}/>
																</div>
																<div className={styles.summaryMeta}>
																	<span>{percent}%</span>
																	<span className={styles.summaryState} data-tone={getProgressTone(item.progress)}>{getProgressLabel(item.progress)}</span>
																</div>
															</div>
														);
													})}
												</div>
											</section>
										</div>
									</div>
								)}
							</>
						)}
					</article>
				</section>

				<section className={styles.contentGroup}>
					<div className={styles.groupHeader}>
						<h3>게임 소식</h3>
						<p>공지와 이벤트를 한 번에 빠르게 확인하세요.</p>
					</div>
					<div className={`${styles.feedSection} ${styles.gameFeedSection}`}>
						<article className={`${styles.feedPanel} ${styles.noticePanel} ${styles.gameNoticePanel}`}>
							<div className={styles.feedHeader}>
								<h2>게임 소식</h2>
								<button type="button" onClick={() => navigate("/news")}>
									전체 보기
									<ArrowRight size={14}/>
								</button>
							</div>
							<div className={styles.feedTabs}>
								{NOTICE_FEED_TABS.map((tab) => (
									<button
										key={tab.key}
										type="button"
										className={selectedNoticeTab === tab.key ? styles.activeFeedTab : ""}
										onClick={() => setSelectedNoticeTab(tab.key)}
									>
										{tab.label}
									</button>
								))}
							</div>
							{feedLoading ? (
								<div className={styles.feedLoading}>
									<RefreshCw size={16} className={styles.spinning}/>
									<span>게임 소식 로딩 중...</span>
								</div>
							) : visibleNotices.length === 0 ? (
								<div className={styles.feedEmpty}>선택한 분류의 게임 소식이 없습니다.</div>
							) : (
								<div className={`${styles.feedList} ${styles.noticeFeedList}`}>
									{visibleNotices.map((notice) => (
										<a
											key={notice.noticeId}
											className={`${styles.feedItem} ${styles.noticeFeedItem}`}
											href={getNoticeLink(notice.noticeType, notice.noticeId)}
											target="_blank"
											rel="noopener noreferrer"
										>
											<div className={styles.noticeFeedRow}>
												<span className={`${styles.feedType} ${styles.noticeFeedType}`}>{getNoticeTypeLabel(notice.noticeType)}</span>
												<div className={styles.feedTitle}>{notice.title}</div>
												<span className={styles.noticeFeedDate}>{formatDate(notice.publishedDate)}</span>
											</div>
										</a>
									))}
								</div>
							)}
						</article>

						<div className={styles.gameFeedRightColumn}>
							<article className={`${styles.feedPanel} ${styles.timerPanel}`}>
								<div className={`${styles.feedHeader} ${styles.timerPanelHeader}`}>
									<h2>필드 출현 타이머</h2>
									<span className={styles.timerPanelTimezone}>KST 기준</span>
								</div>
								<div className={styles.spawnTimerGrid}>
									<div className={styles.spawnTimerCard}>
										<div className={styles.spawnTimerLabelRow}>
											<strong>어비스 구멍</strong>
											<span>주기 36시간 15분</span>
										</div>
										<div className={styles.spawnTimerValue}>{formatRemainingTime(abyssHoleSpawnTimer.remainingMs)}</div>
										<div className={styles.spawnTimerMeta}>다음 출현 {formatKstMonthDayClock(abyssHoleSpawnTimer.nextKstDate)}</div>
									</div>
									<div className={styles.spawnTimerCard}>
										<div className={styles.spawnTimerLabelRow}>
											<strong>소환의 결계</strong>
											<span>매시 정각</span>
										</div>
										<div className={styles.spawnTimerValue}>{formatRemainingTime(summoningBarrierSpawnTimer.remainingMs)}</div>
										<div className={styles.spawnTimerMeta}>다음 출현 {formatKstClock(summoningBarrierSpawnTimer.nextHour, summoningBarrierSpawnTimer.nextMinute)}</div>
									</div>
								</div>
							</article>

							<article className={`${styles.feedPanel} ${styles.gameEventPanel}`}>
								<div className={styles.feedHeader}>
									<h2>이벤트 목록</h2>
									<button type="button" onClick={() => navigate("/events")}>
										전체 보기
										<ArrowRight size={14}/>
									</button>
								</div>
								<div className={styles.feedTabs}>
									{EVENT_FEED_TABS.map((tab) => (
										<button
											key={tab.key}
											type="button"
											className={selectedEventTab === tab.key ? styles.activeFeedTab : ""}
											onClick={() => setSelectedEventTab(tab.key)}
										>
											{tab.label}
										</button>
									))}
								</div>
								{feedLoading ? (
									<div className={styles.feedLoading}>
										<RefreshCw size={16} className={styles.spinning}/>
										<span>이벤트 로딩 중...</span>
									</div>
								) : filteredEvents.length === 0 ? (
									<div className={styles.feedEmpty}>선택한 조건의 이벤트가 없습니다.</div>
								) : (
									<div className={`${styles.feedList} ${styles.eventFeedList}`}>
										{filteredEvents.map((event) => (
											<a
												key={event.eventId}
												className={`${styles.feedItem} ${styles.eventFeedItem}`}
												href={`https://mabinogimobile.nexon.com/News/Events/${event.eventId}`}
												target="_blank"
												rel="noopener noreferrer"
											>
												<div className={styles.eventFeedThumbWrap}>
													{event.thumbnail ? (
														<img src={event.thumbnail} alt={event.title} className={styles.eventFeedThumb} loading="lazy"/>
													) : (
														<div className={styles.eventFeedThumbFallback}>EVENT</div>
													)}
												</div>
												<div className={styles.eventFeedBody}>
													<div className={styles.eventFeedTop}>
														<span className={`${styles.eventFeedDeadline} ${endingSoonEventIds.has(event.eventId) ? styles.eventFeedDeadlineUrgent : ""}`}>
															{getEventDeadlineLabel(event)}
														</span>
														<span className={styles.eventFeedDateRange}>종료 {formatDate(event.endDate)}</span>
													</div>
													<div className={styles.feedTitle}>{event.title}</div>
												</div>
											</a>
										))}
									</div>
								)}
							</article>
						</div>
					</div>
				</section>

				{feedError && <div className={styles.feedError}>{feedError}</div>}

				<section className={styles.contentGroup}>
					<div className={styles.groupHeader}>
						<h3>커뮤니티</h3>
						<p>게시판 최신 글과 갤러리 최신 이미지를 확인하세요.</p>
					</div>
					<div className={styles.communitySection}>
						<article className={`${styles.feedPanel} ${styles.latestPanel} ${styles.boardPanel}`}>
							<div className={styles.feedHeader}>
								<h2>게시판 최신 글</h2>
								<button type="button" onClick={() => navigate("/board")}>
									전체 보기
									<ArrowRight size={14}/>
								</button>
							</div>
							{feedLoading ? (
								<div className={styles.feedLoading}>
									<RefreshCw size={16} className={styles.spinning}/>
									<span>게시판 로딩 중...</span>
								</div>
							) : latestBoardPosts.length === 0 ? (
								<div className={styles.feedEmpty}>표시할 게시글이 없습니다.</div>
							) : (
								<div className={`${styles.feedList} ${styles.noticeFeedList}`}>
									{latestBoardPosts.map((post) => (
										<button
											key={`${post.postId}-${post.createdAt}`}
											type="button"
											className={`${styles.feedItem} ${styles.communityItemBtn} ${styles.noticeFeedItem}`}
											onClick={() => handleOpenBoardPost(post)}
										>
											<div className={styles.noticeFeedRow}>
												<span className={`${styles.feedType} ${styles.noticeFeedType}`}>{getBoardFeedCategoryLabel(post)}</span>
												<div className={styles.feedTitle}>{post.title}</div>
												<span className={styles.noticeFeedDate}>{formatDate(post.createdAt)}</span>
											</div>
										</button>
									))}
								</div>
							)}
						</article>

						<article className={`${styles.feedPanel} ${styles.latestPanel} ${styles.galleryPanel}`}>
							<div className={styles.feedHeader}>
								<h2>갤러리 최신 이미지</h2>
								<button type="button" onClick={() => navigate("/gallery")}>
									전체 보기
									<ArrowRight size={14}/>
								</button>
							</div>
							{feedLoading ? (
								<div className={styles.feedLoading}>
									<RefreshCw size={16} className={styles.spinning}/>
									<span>갤러리 로딩 중...</span>
								</div>
							) : latestGalleryPosts.length === 0 ? (
								<div className={styles.feedEmpty}>표시할 이미지가 없습니다.</div>
							) : (
								<div className={styles.galleryPreviewGrid}>
									{latestGalleryPosts.map((post, index) => {
										const galleryTitle = getGalleryTitle(post);
										const galleryImageUrl = getGalleryImageUrl(post);
										return (
											<button
												key={`${post.photoPostId ?? `external-${index}`}-${post.createdAt}`}
												type="button"
												className={styles.galleryPreviewItem}
												onClick={() => handleOpenGalleryPost(post)}
											>
												<img src={galleryImageUrl} alt={galleryTitle}/>
												<div className={styles.galleryPreviewCaption}>
													<strong>{galleryTitle}</strong>
													<span>{getGalleryAuthor(post)}</span>
												</div>
											</button>
										);
									})}
								</div>
							)}
						</article>
					</div>
				</section>
			</div>
		</div>
	);
};

export default HomePage;
