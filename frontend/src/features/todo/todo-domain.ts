import type {FavoriteGameItem} from "@/types";

/**
 * Constant TODO_AUTO_SAVE_DEBOUNCE_MS.
 */
export const TODO_AUTO_SAVE_DEBOUNCE_MS = 5 * 1000;
/**
 * Constant TODO_HOMEWORK_SAVE_DEBOUNCE_MS.
 */
export const TODO_HOMEWORK_SAVE_DEBOUNCE_MS = 2 * 1000;
/**
 * Constant TODO_FAVORITE_SEARCH_DEBOUNCE_MS.
 */
export const TODO_FAVORITE_SEARCH_DEBOUNCE_MS = 300;
/**
 * Constant TODO_RANK_STALE_MS.
 */
export const TODO_RANK_STALE_MS = 10 * 60 * 1000;
/**
 * Constant TODO_FAVORITE_STORAGE_KEY.
 */
const TODO_FAVORITE_STORAGE_KEY = "mobinogi:todoFavoriteItems";

export type TodoAutoSaveStrategy = "debounce" | "leadingTrailingThrottle";
export type ServerSharedDailyField = "freeShopPurchase" | "gemTreasureChest";

export const TODO_SERVERS:ReadonlyArray<{id:number; name:string}> = [
	{id : 1, name : "데이안"}, {id : 2, name : "아이라"}, {id : 3, name : "던컨"}, {id : 4, name : "알리사"},
	{id : 5, name : "메이븐"}, {id : 6, name : "라사"}, {id : 7, name : "칼릭스"}
];

/**
 * Constant SERVER_SHARED_DAILY_FIELD_SET.
 */
const SERVER_SHARED_DAILY_FIELD_SET = new Set<ServerSharedDailyField>([
	"freeShopPurchase",
	"gemTreasureChest"
]);

/**
 * Utility function isServerSharedDailyField.
 */
export const isServerSharedDailyField = (field?:string):field is ServerSharedDailyField => {
	return !!field && SERVER_SHARED_DAILY_FIELD_SET.has(field as ServerSharedDailyField);
};

/**
 * Utility function isTodoRankStale.
 */
export const isTodoRankStale = (rankUpdatedAt?:string, staleMs:number = TODO_RANK_STALE_MS):boolean => {
	if(!rankUpdatedAt){
		return true;
	}
	const updatedAtMs = new Date(rankUpdatedAt).getTime();
	if(Number.isNaN(updatedAtMs)){
		return true;
	}
	return Date.now() - updatedAtMs >= staleMs;
};

/**
 * Utility function isFavoriteItem.
 */
const isFavoriteItem = (item:unknown):item is FavoriteGameItem => {
	if(typeof item !== "object" || item == null){
		return false;
	}
	const typedItem = item as Partial<FavoriteGameItem>;
	return typeof typedItem.itemId === "number" && typeof typedItem.itemName === "string";
};

/**
 * Utility function normalizeFavoriteItem.
 */
const normalizeFavoriteItem = (item:FavoriteGameItem):FavoriteGameItem => {
	return {
		itemId : item.itemId,
		itemName : item.itemName,
		itemType : item.itemType,
		itemRarity : item.itemRarity
	};
};

/**
 * Utility function loadTodoFavoriteItems.
 */
export const loadTodoFavoriteItems = ():FavoriteGameItem[] => {
	if(typeof window === "undefined"){
		return [];
	}
	try{
		const raw = window.localStorage.getItem(TODO_FAVORITE_STORAGE_KEY);
		if(!raw){
			return [];
		}
		const parsed = JSON.parse(raw);
		if(!Array.isArray(parsed)){
			return [];
		}
		return parsed.filter(isFavoriteItem).map(normalizeFavoriteItem);
	}catch{
		return [];
	}
};

/**
 * Utility function saveTodoFavoriteItems.
 */
export const saveTodoFavoriteItems = (items:FavoriteGameItem[]) => {
	if(typeof window === "undefined"){
		return;
	}
	try{
		window.localStorage.setItem(TODO_FAVORITE_STORAGE_KEY, JSON.stringify(items));
	}catch{
		// Ignore write errors (private mode/quota issues)
	}
};
