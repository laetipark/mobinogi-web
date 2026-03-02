import type {GameClassItem} from "@/types";

export type GameClassPrefix = "warrior_" | "archer_" | "mage_" | "healer_" | "bard_" | "thief_";

export const GAME_CLASS_PREFIX_ORDER:GameClassPrefix[] = [
	"warrior_",
	"archer_",
	"mage_",
	"healer_",
	"bard_",
	"thief_"
];

const GAME_CLASS_COLOR_MAP:Record<GameClassPrefix, string> = {
	"warrior_" : "#C85A5A",
	"archer_" : "#4E9E6A",
	"mage_" : "#5B8ECF",
	"healer_" : "#D68482",
	"bard_" : "#B46A3F",
	"thief_" : "#D8A14A"
};

/**
 * Utility function getClassPrefixOrder.
 */
const getClassPrefixOrder = (classCode?:string | null):number => {
	const prefix = getGameClassPrefix(classCode);
	if(!prefix){
		return Number.MAX_SAFE_INTEGER;
	}
	return GAME_CLASS_PREFIX_ORDER.indexOf(prefix);
};

/**
 * Utility function getGameClassPrefix.
 */
export const getGameClassPrefix = (classCode?:string | null):GameClassPrefix | null => {
	/**
	 * Utility function value.
	 */
	const value = (classCode || "").trim().toLowerCase();
	for(const prefix of GAME_CLASS_PREFIX_ORDER){
		if(value.startsWith(prefix)){
			return prefix;
		}
	}
	return null;
};

/**
 * Utility function getGameClassColor.
 */
export const getGameClassColor = (classCode?:string | null):string | null => {
	const prefix = getGameClassPrefix(classCode);
	return prefix ? GAME_CLASS_COLOR_MAP[prefix] : null;
};

/**
 * Utility function hexToRgba.
 */
const hexToRgba = (hex:string, alpha:number):string => {
	const normalized = hex.replace("#", "");
	if(normalized.length !== 6){
		return `rgba(0, 0, 0, ${alpha})`;
	}
	const r = parseInt(normalized.slice(0, 2), 16);
	const g = parseInt(normalized.slice(2, 4), 16);
	const b = parseInt(normalized.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Utility function getGameClassColorStyle.
 */
export const getGameClassColorStyle = (classCode?:string | null):{color:string; backgroundColor:string; borderColor:string} | undefined => {
	const color = getGameClassColor(classCode);
	if(!color){
		return undefined;
	}
	return {
		color,
		backgroundColor : hexToRgba(color, 0.16),
		borderColor : hexToRgba(color, 0.45)
	};
};

/**
 * Utility function normalizeSelectableClasses.
 */
export const normalizeSelectableClasses = (classes:GameClassItem[]):GameClassItem[] => {
	return [...classes]
		.filter((cls) => !cls.isApprentice && !cls.className.includes("견습"))
		.sort((a, b) => {
			const aOrder = getClassPrefixOrder(a.classCode);
			const bOrder = getClassPrefixOrder(b.classCode);
			if(aOrder !== bOrder){
				return aOrder - bOrder;
			}
			if(a.classCode !== b.classCode){
				return a.classCode.localeCompare(b.classCode);
			}
			return a.className.localeCompare(b.className);
		});
};
