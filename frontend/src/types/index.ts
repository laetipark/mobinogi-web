export interface User{
	id:number;
	username:string;
	email:string;
	createdAt:string;
	provider?:"local" | "kakao";
	kakaoId?:string;
	profileImage?:string;
	nickname?:string;
}

export interface AuthContextType{
	user:User | null;
	login:(username:string, password:string) => Promise<User>;
	register:(username:string, email:string, password:string) => Promise<User>;
	logout:() => void;
	loading:boolean;
	// 카카오 로그인 관련 추가
	kakaoLogin?:() => void;
	kakaoLogout?:() => void;
	isKakaoLoggedIn?:boolean;
	kakaoLoading?:boolean;
	kakaoError?:string | null;
}

export interface LoginFormData{
	username:string;
	password:string;
}

export interface RegisterFormData{
	username:string;
	email:string;
	password:string;
	confirmPassword:string;
}

export interface PasswordStrengthResult{
	score:number;
	text:string;
}

// 게임 아이템 관련 타입들
export interface GameItem{
	itemId:number;
	itemName:string;
	itemType:string;
	itemRarity:string;
	itemEffect:string;
}

export interface GameItemPage{
	content:GameItem[];
	pageable:{
		sort:{
			sorted:boolean;
			unsorted:boolean;
		};
		pageNumber:number;
		pageSize:number;
	};
	totalElements:number;
	totalPages:number;
	last:boolean;
	first:boolean;
	numberOfElements:number;
}

export interface GameItemSearchParams{
	page?:number;
	size?:number;
	sortBy?:string;
	sortDir?:"asc" | "desc";
	keyword?:string;
}

// 지역 정보
export interface GameRegion{
	regionId:number;
	regionName:string;
}

// NPC 정보
export interface GameNpc{
	npcId:number;
	npcName:string;
	regionId:number;
}

// 물물교환 정보
export interface LifeBarter{
	barterId:number;
	regionId:number;
	npcId:number;
	itemId:number;
	itemWeight:number;
	exchangeId:number;
	exchangeCost:number;
	barterQty:number;
	barterInitCycle?:number;
	barterInitDate?:string;
	barterInitDay?:number;
	barterEtc?:string;
	gameRegion?:GameRegion;
	gameNpc?:GameNpc;
	gameItem?:GameItem;
	exchangeItem?:GameItem;
}

// 제작 정보
export interface LifeCraft{
	craftId:number;
	craftSubId:number;
	itemId:number;
	craftIngredientId:number;
	craftIngredientCost:number;
	gameItem?:GameItem;
	ingredientItem?:GameItem;
}

// 아이템 상세 데이터 (검색 결과)
export interface GameItemData{
	itemName:string;
	bartersByItemId:LifeBarter[];
	bartersByExchangeId:LifeBarter[];
	craftsBySubId:Record<number, LifeCraft[]>;
}

// 물물교환 페이지 응답
export interface LifeBarterPage{
	content:LifeBarter[];
	pageable:{
		sort:{
			sorted:boolean;
			unsorted:boolean;
		};
		pageNumber:number;
		pageSize:number;
	};
	totalElements:number;
	totalPages:number;
	last:boolean;
	first:boolean;
	numberOfElements:number;
}

// 제작 페이지 응답
export interface LifeCraftPage{
	content:LifeCraft[];
	pageable:{
		sort:{
			sorted:boolean;
			unsorted:boolean;
		};
		pageNumber:number;
		pageSize:number;
	};
	totalElements:number;
	totalPages:number;
	last:boolean;
	first:boolean;
	numberOfElements:number;
}

// 검색 파라미터 (공통)
export interface ListSearchParams{
	page?:number;
	size?:number;
	sortBy?:string;
	sortDir?:"asc" | "desc";
	keyword?:string;
}