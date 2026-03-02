export type TabType = "items" | "barter" | "craft";

/**
 * Constant MAX_SEARCH_SUGGESTIONS.
 */
export const MAX_SEARCH_SUGGESTIONS = 8;

/**
 * Constant DEFAULT_ITEM_RARITY_OPTIONS.
 */
export const DEFAULT_ITEM_RARITY_OPTIONS = ["일반", "고급", "레어", "엘리트", "에픽", "유니크", "전설", "신화"];
/**
 * Constant EQUIPMENT_MAIN_MENU.
 */
export const EQUIPMENT_MAIN_MENU = "장비";
/**
 * Constant DEFAULT_ITEM_MAIN_MENU.
 */
export const DEFAULT_ITEM_MAIN_MENU = "";
/**
 * Constant DEFAULT_ITEM_SUB_MENU.
 */
export const DEFAULT_ITEM_SUB_MENU = "";
/**
 * Constant EQUIPMENT_SUB_MENU_ORDER.
 */
export const EQUIPMENT_SUB_MENU_ORDER = [
	"룬",
	"무기 룬",
	"방어구 룬",
	"장신구 룬",
	"무기",
	"방어구",
	"모자",
	"상의",
	"하의",
	"장갑",
	"신발",
	"장신구",
	"보석",
	"아티팩트"
] as const;

/**
 * Constant ITEM_MAIN_MENU_ORDER.
 */
const ITEM_MAIN_MENU_ORDER = [EQUIPMENT_MAIN_MENU, "가구", "아이템", "포션", "의상/탈것"] as const;

const ITEM_SUB_MENU_ORDER_BY_MAIN_MENU:Record<string, string[]> = {
	[EQUIPMENT_MAIN_MENU] : [...EQUIPMENT_SUB_MENU_ORDER]
};

/**
 * Utility function createOrderIndexMap.
 */
const createOrderIndexMap = (values:readonly string[]):Map<string, number> => new Map(values.map((value, index) => [value, index]));

/**
 * Constant ITEM_MAIN_MENU_ORDER_INDEX.
 */
export const ITEM_MAIN_MENU_ORDER_INDEX = createOrderIndexMap(ITEM_MAIN_MENU_ORDER);
export const ITEM_SUB_MENU_ORDER_INDEX_BY_MAIN_MENU:Record<string, Map<string, number>> = Object.fromEntries(
	Object.entries(ITEM_SUB_MENU_ORDER_BY_MAIN_MENU).map(([mainMenu, subMenus]) => [mainMenu, createOrderIndexMap(subMenus)])
);

/**
 * Utility function compareByPreferredOrder.
 */
const compareByPreferredOrder = (a:string, b:string, orderIndexMap?:Map<string, number>):number => {
	const fallbackIndex = Number.MAX_SAFE_INTEGER;
	const aOrder = orderIndexMap?.get(a) ?? fallbackIndex;
	const bOrder = orderIndexMap?.get(b) ?? fallbackIndex;

	if(aOrder !== bOrder){
		return aOrder - bOrder;
	}

	return a.localeCompare(b, "ko");
};

/**
 * Constant ITEM_RARITY_FILTER_ORDER_INDEX.
 */
const ITEM_RARITY_FILTER_ORDER_INDEX = createOrderIndexMap(DEFAULT_ITEM_RARITY_OPTIONS);

/**
 * Utility function sortRarityLabelsForFilter.
 */
export const sortRarityLabelsForFilter = (rarities:string[]):string[] => [...rarities].sort((a, b) => compareByPreferredOrder(a, b, ITEM_RARITY_FILTER_ORDER_INDEX));

/**
 * Utility function normalizeSortText.
 */
const normalizeSortText = (value:string | null | undefined):string => (value ?? "").trim();

/**
 * Utility function normalizeMainMenuForOrder.
 */
export const normalizeMainMenuForOrder = (value:string | null | undefined):string => {
	const normalized = normalizeSortText(value);
	if(!normalized){
		return normalized;
	}

	const canonicalSlashMenu = ITEM_MAIN_MENU_ORDER.find((menu) => menu.includes("/"));
	if(!canonicalSlashMenu || normalized === canonicalSlashMenu){
		return normalized;
	}

	/**
	 * Utility function toSignature.
	 */
	const toSignature = (menu:string):string => menu
		.split("/")
		.map((part) => part.trim())
		.filter(Boolean)
		.sort((a, b) => a.localeCompare(b, "ko"))
		.join("|");

	if(toSignature(normalized) === toSignature(canonicalSlashMenu)){
		return canonicalSlashMenu;
	}

	return normalized;
};

export const ITEM_TAB_PATHS:Record<TabType, string> = {
	items : "/items",
	barter : "/barter",
	craft : "/craft"
};

/**
 * Utility function resolveTabFromPath.
 */
export const resolveTabFromPath = (pathname:string):TabType => {
	const normalizedPath = pathname.toLowerCase();
	if(
		normalizedPath.startsWith("/barter")
		|| normalizedPath.startsWith("/items/barter")
		|| normalizedPath.startsWith("/item/barter")
	){
		return "barter";
	}
	if(
		normalizedPath.startsWith("/craft")
		|| normalizedPath.startsWith("/items/craft")
		|| normalizedPath.startsWith("/item/craft")
	){
		return "craft";
	}
	return "items";
};

/**
 * Constant sortByPreferredOrder.
 */
export const sortByPreferredOrder = compareByPreferredOrder;
