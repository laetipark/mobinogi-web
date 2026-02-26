import type {LifeBarter, LifeCraft} from "./game-life";
import type {PageResponse} from "./common";

export interface GameItem{
	itemId:number;
	itemName:string;
	itemType:string;
	itemMainMenu?:string | null;
	itemSubMenu?:string | null;
	itemRarity:string;
	itemEffect:string;
	itemTranscendence?:string | null;
	itemSource?:string | null;
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
	itemMainMenu?:string | null;
	itemSubMenu?:string | null;
	itemRarity:string;
	itemEffect:string;
	itemTranscendence?:string | null;
	itemSource?:string | null;
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
	itemMainMenu?:string;
	itemSubMenu?:string;
	itemType?:string;
	itemRarity?:string[];
}

export interface GameItemFilterSubMenuOption{
	itemSubMenu:string;
	itemTypes:string[];
}

export interface GameItemFilterMainMenuOption{
	itemMainMenu:string;
	subMenus:GameItemFilterSubMenuOption[];
}

export interface GameItemFilterOptions{
	itemMainMenus?:string[];
	itemSubMenus?:string[];
	itemTypes:string[];
	itemRarities:string[];
	itemCategoryTree?:GameItemFilterMainMenuOption[];
}

export interface GameItemData{
	itemName:string;
	itemType?:string | null;
	itemMainMenu?:string | null;
	itemSubMenu?:string | null;
	itemRarity?:string | null;
	itemEffect?:string | null;
	itemTranscendence?:string | null;
	itemSource?:string | null;
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
