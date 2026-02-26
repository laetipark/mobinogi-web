import type {GameItem} from "./game-item";
import type {PageResponse} from "./common";

export interface GameRegion{
	regionId:number;
	regionName:string;
}

export interface GameNpc{
	npcId:number;
	npcName:string;
	regionId:number;
}

export interface LifeBarter{
	barterId:number;
	regionId:number;
	npcId:number;
	itemId:number;
	itemWeight:number;
	exchangeId:number;
	exchangeCost:number;
	barterQty:number;
	barterInitCycle?:number;
	barterInitDate?:string;
	barterInitDay?:number;
	barterServer?:number;
	barterNpc?:number;
	gameRegion?:GameRegion;
	gameNpc?:GameNpc;
	gameItem?:GameItem;
	exchangeItem?:GameItem;
}

export interface LifeCraft{
	craftId:number;
	craftSubId:number | null;
	itemId:number;
	craftType:string;
	craftName:string;
	itemName:string;
	ingredientName:string;
	craftableLevel:number | null;
	processingTime:number | null;
	craftIngredientId:number;
	craftIngredientCost:number;
	gameItem?:GameItem;
	ingredientItem?:GameItem;
}

export interface BarterFilterNpcOption{
	npcId:number;
	npcName:string;
}

export interface BarterFilterRegionOption{
	regionId:number;
	regionName:string;
	npcs:BarterFilterNpcOption[];
}

export interface BarterFilterOptions{
	regions:BarterFilterRegionOption[];
}

export interface CraftFilterTypeOption{
	craftType:string;
	craftNames:string[];
}

export interface CraftFilterOptions{
	craftTypes:CraftFilterTypeOption[];
}

export type LifeBarterPage = PageResponse<LifeBarter>;
export type LifeCraftPage = PageResponse<LifeCraft>;
