import {
	BarterFilterOptions, CraftFilterOptions, GameItemData, GameItemFilterOptions, GameItemSearchParams,
	GameItemSummaryPage, LifeBarterPage, LifeCraftPage, ListSearchParams
} from "@/types";
import apiService from "./api";

/**
 * Utility function normalizeGameItemSummary.
 */
const normalizeGameItemSummary = (item:any) => ({
	...item,
	itemMainMenu : item?.itemMainMenu ?? item?.item_main_menu ?? null,
	itemSubMenu : item?.itemSubMenu ?? item?.item_sub_menu ?? null,
	itemTranscendence : item?.itemTranscendence ?? item?.item_transcendence ?? null,
	itemSource : item?.itemSource ?? item?.item_source ?? null
});

/**
 * Utility function normalizeGameItemData.
 */
const normalizeGameItemData = (data:any) => ({
	...data,
	itemMainMenu : data?.itemMainMenu ?? data?.item_main_menu ?? null,
	itemSubMenu : data?.itemSubMenu ?? data?.item_sub_menu ?? null,
	itemTranscendence : data?.itemTranscendence ?? data?.item_transcendence ?? null,
	itemSource : data?.itemSource ?? data?.item_source ?? null
});

export class GameItemService{
	/**
	 * 게임 아이템 목록을 페이지네이션으로 조회 (물물교환/제작 요약 정보 포함)
	 */
	static async getGameItems(params:GameItemSearchParams = {}):Promise<GameItemSummaryPage>{
		const {
			page = 0,
			size = 10,
			sortBy = "itemRarity",
			sortDir = "desc",
			keyword,
			itemMainMenu,
			itemSubMenu,
			itemType,
			itemRarity
		} = params;

		const queryParams:Record<string, any> = {
			page,
			size,
			sortBy,
			sortDir
		};

		if(keyword && keyword.trim()){
			queryParams.keyword = keyword.trim();
		}

		if(itemMainMenu && itemMainMenu.trim()){
			queryParams.itemMainMenu = itemMainMenu.trim();
		}

		if(itemSubMenu && itemSubMenu.trim()){
			queryParams.itemSubMenu = itemSubMenu.trim();
		}

		if(itemType && itemType.trim()){
			queryParams.itemType = itemType.trim();
		}

		if(itemRarity && itemRarity.length > 0){
			queryParams.itemRarity = itemRarity.join(",");
		}

		const response = await apiService.get<any>("/items", queryParams);
		return {
			...response,
			content : Array.isArray(response?.content)
				? response.content.map(normalizeGameItemSummary)
				: []
		} as GameItemSummaryPage;
	}

	static async getGameItemFilterOptions():Promise<GameItemFilterOptions>{
		return apiService.get<GameItemFilterOptions>("/items/filters");
	}

	/**
	 * 특정 아이템의 상세 정보 조회 (물물교환, 제작 정보 포함)
	 */
	static async getItemByName(itemName:string):Promise<GameItemData>{
		const response = await apiService.get<any>(`/items/${encodeURIComponent(itemName)}/detail`);
		return normalizeGameItemData(response) as GameItemData;
	}

	/**
	 * 물물교환 목록을 페이지네이션으로 조회
	 */
	static async getBarters(params:ListSearchParams & {
		searchMode?:string;
		cycle?:number;
		regionId?:number;
		npcId?:number;
	} = {}):Promise<LifeBarterPage>{
		const {
			page = 0,
			size = 10,
			sortBy = "barterId",
			sortDir = "asc",
			keyword,
			searchMode,
			cycle,
			regionId,
			npcId
		} = params;

		const queryParams:Record<string, any> = {
			page,
			size,
			sortBy,
			sortDir
		};

		if(keyword && keyword.trim()){
			queryParams.keyword = keyword.trim();
		}

		if(searchMode){
			queryParams.searchMode = searchMode;
		}

		if(cycle !== undefined){
			queryParams.cycle = cycle;
		}

		if(regionId !== undefined){
			queryParams.regionId = regionId;
		}

		if(npcId !== undefined){
			queryParams.npcId = npcId;
		}

		return apiService.get<LifeBarterPage>("/barter/list", queryParams);
	}

	static async getBarterFilterOptions():Promise<BarterFilterOptions>{
		return apiService.get<BarterFilterOptions>("/barter/filters");
	}

	/**
	 * 제작 목록을 페이지네이션으로 조회
	 */
	static async getCrafts(params:ListSearchParams & {
		craftType?:string;
		craftName?:string;
	} = {}):Promise<LifeCraftPage>{
		const {
			page = 0,
			size = 10,
			sortBy = "craftId",
			sortDir = "asc",
			keyword,
			craftType,
			craftName
		} = params;

		const queryParams:Record<string, any> = {
			page,
			size,
			sortBy,
			sortDir
		};

		if(keyword && keyword.trim()){
			queryParams.keyword = keyword.trim();
		}

		if(craftType && craftType.trim()){
			queryParams.craftType = craftType.trim();
		}

		if(craftName && craftName.trim()){
			queryParams.craftName = craftName.trim();
		}

		return apiService.get<LifeCraftPage>("/craft/list", queryParams);
	}

	static async getCraftFilterOptions():Promise<CraftFilterOptions>{
		return apiService.get<CraftFilterOptions>("/craft/filters");
	}
}

export default GameItemService;
