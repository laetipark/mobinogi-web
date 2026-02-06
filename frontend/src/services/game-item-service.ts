import {GameItemSummaryPage, GameItemSearchParams, GameItemData, LifeBarterPage, LifeCraftPage, ListSearchParams} from "@/types";
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

		return apiService.get<GameItemSummaryPage>("/items", queryParams);
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
	static async getBarters(params:ListSearchParams = {}):Promise<LifeBarterPage>{
		const {
			page = 0,
			size = 10,
			sortBy = "barterId",
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
