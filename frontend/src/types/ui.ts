import type {ReactNode, RefObject} from "react";
import type {LucideIcon} from "lucide-react";
import type {BoardComment} from "./board";
import type {GameMonster} from "./character";
import type {GameEvent} from "./event";
import type {GameItem, GameItemSummary} from "./game-item";
import type {LifeBarter, LifeCraft} from "./game-life";
import type {NoticeCategory} from "./notice";
import type {
	CounterTask,
	DailyTasks,
	PhantomTower,
	Resources,
	TodoMemo,
	TodoSettings,
	UserTodoBarter,
	WeeklyTasks
} from "./todo";

export interface KakaoLoginProps{
	showTitle?:boolean;
	redirectPath?:string;
}

export interface CommentItemProps{
	comment:BoardComment;
	onReply:(parentId:number) => void;
	onEdit:(commentId:number, content:string) => void;
	onDelete:(commentId:number) => void;
	isReply?:boolean;
}

export interface MarkdownToolbarProps{
	textareaRef:RefObject<HTMLTextAreaElement | null>;
	content:string;
	setContent:(content:string) => void;
}

export interface ToolbarAction{
	icon:ReactNode;
	title:string;
	action:() => void;
}

export interface LoadingScreenProps{
	message?:string;
}

export interface BarterCardProps{
	barter:LifeBarter;
	onClick?:(barter:LifeBarter) => void;
}

export interface CraftCardProps{
	craft:LifeCraft;
	onClick?:(craft:LifeCraft) => void;
}

export interface GameItemCardProps{
	item:GameItemSummary;
	onClick?:(item:GameItemSummary) => void;
}

export interface GroupedBarterSource{
	regionName:string | null;
	npcName:string | null;
	count:number;
}

export interface ItemDetailModalProps{
	item:GameItem | GameItemSummary;
	onClose:() => void;
}

export interface BarterCartProps{
	characterId:number;
	cycle:number;
	cycleLabel:string;
}

export interface BarterSettingsModalProps{
	characterId:number;
	cycle:number;
	cycleLabel:string;
	existingBarters:UserTodoBarter[];
	onUpdate:(barters:UserTodoBarter[]) => void;
	onClose:() => void;
}

export interface BossChecklistProps{
	label:string;
	monsters:GameMonster[];
	completedIds:number[];
	onChange:(completedIds:number[]) => void;
	maxCompleted?:number;
	groupByName?:boolean;
	visualGroup?:boolean;
	allowDuplicates?:boolean;
	trackedIds?:number[];
}

export interface BossSettingsModalProps{
	title:string;
	monsters:GameMonster[];
	trackedIds:number[];
	exclusiveByName?:boolean;
	maxSelections?:number;
	allowMultiple?:boolean;
	groupByName?:boolean;
	rewardMax?:number;
	onRewardMaxChange?:(max:number) => void;
	onSave:(trackedIds:number[]) => void;
	onClose:() => void;
}

export interface CoinCounterProps{
	label:string;
	current:number;
	max:number;
	chargeIntervalMinutes:number;
	lastChargeTime?:string;
	onChange:(value:number) => void;
}

export interface DailyTaskSectionProps{
	daily:DailyTasks;
	settings?:TodoSettings;
	characterId:number;
	dailyMemos?:TodoMemo[];
	onChange:(daily:DailyTasks, changedField?:string) => void;
	onSettingsChange:(settings:TodoSettings) => void;
	onMemosChange:(memos:TodoMemo[]) => void;
}

export interface MemoTaskModalProps{
	title:string;
	memos:TodoMemo[];
	onSave:(memos:TodoMemo[]) => void;
	onClose:() => void;
}

export interface PhantomTowerSelectorProps{
	value:PhantomTower;
	onChange:(value:PhantomTower) => void;
}

export interface ResourceDisplayProps{
	resources:Resources;
	onChange:(resources:Resources) => void;
}

export interface ResourceItemProps{
	label:string;
	max:number;
	chargeIntervalMinutes:number;
	value?:CounterTask;
	onChange:(value:CounterTask) => void;
}

export interface TaskCounterProps{
	label:string;
	current:number;
	max:number;
	onChange:(value:number) => void;
}

export interface TaskDef{
	key:string;
	label:string;
}

export interface TaskSettingsModalProps{
	title:string;
	taskDefs:TaskDef[];
	order?:string[];
	hiddenTasks?:string[];
	onSave:(order:string[], hiddenTasks:string[]) => void;
	onClose:() => void;
}

export interface SortableTaskItemProps{
	taskKey:string;
	label:string;
	hidden:boolean;
	onToggleHidden:() => void;
}

export interface WeeklyTaskSectionProps{
	weekly:WeeklyTasks;
	fieldBossMonsters:GameMonster[];
	raidMonsters:GameMonster[];
	abyssBossMonsters:GameMonster[];
	settings?:TodoSettings;
	characterId:number;
	weeklyMemos?:TodoMemo[];
	onChange:(weekly:WeeklyTasks) => void;
	onSettingsChange:(settings:TodoSettings) => void;
	onMemosChange:(memos:TodoMemo[]) => void;
}

export interface CharacterManagerProps{
	onClose?:() => void;
	isModal?:boolean;
}

export interface SortableCharacterItem{
	characterId:number;
	characterName:string;
	serverName?:string;
}

export interface SortableCharacterListProps{
	items:SortableCharacterItem[];
	onReorder:(newItems:SortableCharacterItem[]) => void;
}

export interface SortableItemProps{
	item:SortableCharacterItem;
	index:number;
}

export interface AuthProviderProps{
	children:ReactNode;
}

export interface NormalizedGameEvent extends GameEvent{
	start:Date;
	end:Date;
}

export interface TimelineModel{
	start:Date;
	end:Date;
	totalDays:number;
	trackWidth:number;
	days:Date[];
}

export interface ParsedSummaryTable{
	headers:string[];
	rows:string[][];
	columnCount:number;
	hasHeader:boolean;
	hasSpan:boolean;
	rawHtml:string;
}

export interface SummaryGroup{
	title:string;
	rows:string[];
}

export interface NoticeTab{
	key:NoticeCategory;
	label:string;
	description:string;
}

export type MenuTone = "news" | "events" | "board" | "gallery" | "todo" | "items";

export interface QuickMenu{
	title:string;
	description:string;
	path:string;
	icon:LucideIcon;
	tone:MenuTone;
	authRequired?:boolean;
}
