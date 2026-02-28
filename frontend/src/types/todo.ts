export interface CounterTask{
	current:number;
	lastChargeTime?:string;
}

export interface PhantomTower{
	floor:number;
	stage:number;
}

export interface BossProgress{
	completed:number[];
	tracked:number[];
}

export interface DailyTasks{
	dayDungeon:boolean;
	freeShopPurchase?:boolean;
	gemTreasureChest?:boolean;
}

export interface Resources{
	silverCoin?:CounterTask;
	demonTribute?:CounterTask;
}

export interface Vanguard{
	reward:number;
	emergency:number;
	quest:boolean;
}

export interface WeeklyTasks{
	summoningBarrier:number;
	blackHole:number;
	phantomTower:PhantomTower;
	fieldBoss:BossProgress;
	abyss:BossProgress;
	abyssReward:number;
	abyssRewardMax:number;
	raid:BossProgress;
	vanguard?:Vanguard;
}

export interface TodoSettings{
	dailyOrder?:string[];
	weeklyOrder?:string[];
	hiddenTasks?:string[];
}

export interface TodoMemo{
	id:string;
	label:string;
	completed:boolean;
}

export interface TodoData{
	daily:DailyTasks;
	weekly:WeeklyTasks;
	resources?:Resources;
	settings?:TodoSettings;
	dailyMemos?:TodoMemo[];
	weeklyMemos?:TodoMemo[];
}

export interface UserTodo{
	userId:number;
	characterId:number;
	characterName:string;
	serverId?:number;
	serverName?:string;
	classId?:number;
	className?:string;
	todoData:TodoData;
	lastDailyReset?:string;
	lastWeeklyReset?:string;
	userPower?:number;
	userVitality?:number;
	userAttractiveness?:number;
	rankUpdatedAt?:string;
}

export interface UserTodoBarter{
	id:number;
	userId:number;
	characterId:number;
	itemName:string;
	exchangeItemName:string;
	npcName:string;
	regionName:string;
	barterCycle:string;
	completed:boolean;
	completedCount?:number;
	checkedByUserId?:number;
	checkedByNickname?:string;
	checkedByCharacterId?:number;
	checkedByCharacterName?:string;
	checkedAt?:string;
	exchangeCost?:number;
	barterQty?:number;
	barterInitCycle?:number;
	barterServer?:number;
	barterNpc?:number;
}

export interface FavoriteGameItem{
	itemId:number;
	itemName:string;
	itemType?:string;
	itemRarity?:string;
}
