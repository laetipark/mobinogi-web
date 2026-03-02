export interface ItemRarityInfo{
	label:string;
	color:string;
	bg:string;
}

const ITEM_RARITY_MAP:Record<string, ItemRarityInfo> = {
	"일반" : {label : "일반", color : "#cccccc", bg : "rgba(204, 204, 204, 0.18)"},
	"고급" : {label : "고급", color : "#34a853", bg : "rgba(52, 168, 83, 0.18)"},
	"레어" : {label : "레어", color : "#4a86e8", bg : "rgba(74, 134, 232, 0.18)"},
	"엘리트" : {label : "엘리트", color : "#674ea7", bg : "rgba(103, 78, 167, 0.2)"},
	"에픽" : {label : "에픽", color : "#c27ba0", bg : "rgba(194, 123, 160, 0.2)"},
	"전설" : {label : "전설", color : "#ff6d01", bg : "rgba(255, 109, 1, 0.18)"},
	"신화" : {label : "신화", color : "#e2c14f", bg : "rgba(226, 193, 79, 0.2)"},
	"유니크" : {label : "유니크", color : "#c3bc9e", bg : "rgba(195, 188, 158, 0.24)"}
};

const ITEM_RARITY_ALIASES:Record<string, string> = {
	"노말" : "일반",
	"일반" : "일반",
	"normal" : "일반",
	"common" : "일반",
	"고급" : "고급",
	"레어" : "레어",
	"희귀" : "레어",
	"rare" : "레어",
	"엘리트" : "엘리트",
	"영웅" : "엘리트",
	"elite" : "엘리트",
	"에픽" : "에픽",
	"epic" : "에픽",
	"전설" : "전설",
	"legendary" : "전설",
	"신화" : "신화",
	"mythic" : "신화",
	"유니크" : "유니크",
	"unique" : "유니크"
};

/**
 * Utility function getItemRarityInfo.
 */
export const getItemRarityInfo = (rarity?:string | null):ItemRarityInfo => {
	/**
	 * Utility function value.
	 */
	const value = (rarity || "").trim();
	const lowerValue = value.toLowerCase();
	const normalized = ITEM_RARITY_ALIASES[lowerValue] || ITEM_RARITY_ALIASES[value] || "일반";
	return ITEM_RARITY_MAP[normalized] || ITEM_RARITY_MAP["일반"];
};
