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
}

export interface Resources{
	silverCoin?:CounterTask;
	demonTribute?:CounterTask;
}

export interface WeeklyTasks{
	summoningBarrier:number;
	blackHole:number;
	phantomTower:PhantomTower;
	fieldBoss:BossProgress;
	abyssReward:number;
	abyssRewardMax:number;
	raid:BossProgress;
}

export interface TodoData{
	daily:DailyTasks;
	weekly:WeeklyTasks;
	resources?:Resources;
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
	exchangeCost?:number;
	barterQty?:number;
	barterInitCycle?:number;
	barterServer?:number;
	barterNpc?:number;
}
