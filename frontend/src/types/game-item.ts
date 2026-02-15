import type {LifeBarter, LifeCraft} from "./game-life";
import type {PageResponse} from "./common";

export interface GameItem{
	itemId:number;
	itemName:string;
	itemType:string;
	itemRarity:string;
	itemEffect:string;
}

export interface BarterSourceInfo{
	regionName:string | null;
	npcName:string | null;
	exchangeItemName:string | null;
	exchangeCost:number;
}

export interface GameItemSummary{
	itemId:number;
	itemName:string;
	itemType:string;
	itemRarity:string;
	itemEffect:string;
	hasBarterSource:boolean;
	barterSources:BarterSourceInfo[] | null;
	hasCraftSource:boolean;
	craftRecipeCount:number;
}

export interface GameItemSearchParams{
	page?:number;
	size?:number;
	sortBy?:string;
	sortDir?:"asc" | "desc";
	keyword?:string;
	itemType?:string;
	itemRarity?:string[];
}

export interface GameItemFilterOptions{
	itemTypes:string[];
	itemRarities:string[];
}

export interface GameItemData{
	itemName:string;
	bartersByItemId:LifeBarter[];
	bartersByExchangeId:LifeBarter[];
	craftsBySubId:Record<number, LifeCraft[]>;
}

export interface GameClassItem{
	classId:number;
	classCode:string;
	className:string;
	isApprentice:boolean;
}

export type GameItemPage = PageResponse<GameItem>;
export type GameItemSummaryPage = PageResponse<GameItemSummary>;
