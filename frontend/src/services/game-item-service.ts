import {GameItemPage, GameItemSearchParams} from "@/types";
import apiService from "./api";

export class GameItemService{
	/**
	 * 게임 아이템 목록을 페이지네이션으로 조회
	 */
	static async getGameItems(params:GameItemSearchParams = {}):Promise<GameItemPage>{
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
		
		return apiService.get<GameItemPage>("/item/itemList", queryParams);
	}
	
	/**
	 * 특정 아이템의 상세 정보 조회
	 */
	static async getItemByName(itemName:string){
		return apiService.get("/item/itemUse", {itemName});
	}
}

export default GameItemService;
