import {GameItemSummaryPage, GameItemSearchParams, GameItemData, LifeBarterPage, LifeCraftPage, ListSearchParams, GameItemFilterOptions} from "@/types";
import apiService from "./api";

export class GameItemService{
	/**
	 * 게임 아이템 목록을 페이지네이션으로 조회 (물물교환/제작 요약 정보 포함)
	 */
	static async getGameItems(params:GameItemSearchParams = {}):Promise<GameItemSummaryPage>{
		const {
			page = 0,
			size = 10,
			sortBy = "itemId",
			sortDir = "asc",
			keyword,
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

		if(itemType && itemType.trim()){
			queryParams.itemType = itemType.trim();
		}

		if(itemRarity && itemRarity.length > 0){
			queryParams.itemRarity = itemRarity.join(",");
		}

		return apiService.get<GameItemSummaryPage>("/items", queryParams);
	}

	static async getGameItemFilterOptions():Promise<GameItemFilterOptions>{
		return apiService.get<GameItemFilterOptions>("/items/filters");
	}

	/**
	 * 특정 아이템의 상세 정보 조회 (물물교환, 제작 정보 포함)
	 */
	static async getItemByName(itemName:string):Promise<GameItemData>{
		return apiService.get<GameItemData>(`/items/${encodeURIComponent(itemName)}/detail`);
	}

	/**
	 * 물물교환 목록을 페이지네이션으로 조회
	 */
	static async getBarters(params:ListSearchParams & {searchMode?:string; cycle?:number} = {}):Promise<LifeBarterPage>{
		const {
			page = 0,
			size = 10,
			sortBy = "barterId",
			sortDir = "asc",
			keyword,
			searchMode,
			cycle
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

		return apiService.get<LifeBarterPage>("/barter/list", queryParams);
	}

	/**
	 * 제작 목록을 페이지네이션으로 조회
	 */
	static async getCrafts(params:ListSearchParams = {}):Promise<LifeCraftPage>{
		const {
			page = 0,
			size = 10,
			sortBy = "craftId",
			sortDir = "asc",
			keyword
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

		return apiService.get<LifeCraftPage>("/craft/list", queryParams);
	}
}

export default GameItemService;
