export interface User{
	id:number;
	userId?:number;
	username:string;
	email:string;
	createdAt:string;
	provider?:"local" | "kakao";
	kakaoId?:string;
	profileImage?:string;
	nickname?:string;
	discordId?:string;
	discordUsername?:string;
	discordAvatar?:string;
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

// 물물교환 출처 정보
export interface BarterSourceInfo{
	regionName:string | null;
	npcName:string | null;
	exchangeItemName:string | null;
	exchangeCost:number;
}

// 아이템 요약 정보 (목록용 - 물물교환/제작 요약 포함)
export interface GameItemSummary{
	itemId:number;
	itemName:string;
	itemType:string;
	itemRarity:string;
	itemEffect:string;
	hasBarterSource:boolean;
	barterSources:BarterSourceInfo[] | null;
	hasCraftSource:boolean;
	craftRecipeCount:number;
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

export interface GameItemSummaryPage{
	content:GameItemSummary[];
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

// 캐릭터 정보
export interface UserCharacter{
	characterId:number;
	userId:number;
	characterName:string;
	serverName?:string;
	className?:string;
	createdAt:string;
}

export interface UserCharacterRequest{
	characterName:string;
	serverName?:string;
	className?:string;
}

// 몬스터 정보
export interface GameMonster{
	monsterId:number;
	regionId:number;
	regionName:string | null;
	monsterType:string;
	monsterDifficulty:string;
	monsterName:string;
}

// 게시판 관련 타입
export interface BoardCategory{
	categoryId:number;
	categoryName:string;
	displayOrder:number;
}

export interface BoardPost{
	postId:number;
	categoryId:number | null;
	categoryName:string | null;
	userId:number | null;
	authorNickname:string | null;
	authorProfileImage:string | null;
	authorDiscordId?:string | null;
	title:string;
	content:string;
	viewCount:number;
	sourceType:"USER" | "NOTION" | "DISCORD";
	externalUrl:string | null;
	externalAuthor:string | null;
	images?:string[];
	commentCount:number;
	createdAt:string;
	updatedAt:string;
}

export interface BoardPostCreateRequest{
	categoryId:number | null;
	title:string;
	content:string;
}

export interface BoardPostUpdateRequest{
	categoryId:number | null;
	title:string;
	content:string;
}

export interface BoardComment{
	commentId:number;
	postId:number;
	userId:number;
	authorNickname:string | null;
	authorProfileImage:string | null;
	parentCommentId:number | null;
	content:string;
	createdAt:string;
	updatedAt:string;
	replies?:BoardComment[];
}

export interface BoardCommentCreateRequest{
	parentCommentId?:number | null;
	content:string;
}

export interface BoardPostPage{
	content:BoardPost[];
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

// 숙제 관련 타입
export interface CounterTask{
	current:number;
	lastChargeTime?:string;
}

export interface PhantomTower{
	floor:number;
	stage:number;
}

export interface BossProgress{
	completed:number[];
	tracked:number[];
}

export interface DailyTasks{
	dayDungeon:boolean;
}

export interface Resources{
	silverCoin?:CounterTask;
	demonTribute?:CounterTask;
}

export interface WeeklyTasks{
	summoningBarrier:number;
	blackHole:number;
	phantomTower:PhantomTower;
	fieldBoss:BossProgress;
	abyss:number;
	raid:BossProgress;
}

export interface TodoData{
	daily:DailyTasks;
	weekly:WeeklyTasks;
	resources?:Resources;
}

export interface UserTodo{
	userId:number;
	characterId:number;
	characterName:string;
	serverName?:string;
	className?:string;
	todoData:TodoData;
	lastDailyReset?:string;
	lastWeeklyReset?:string;
}

export interface UserTodoBarter{
	id:number;
	userId:number;
	characterId:number;
	barterId:number;
	barterCycle:string;
	completed:boolean;
	itemName?:string;
	exchangeItemName?:string;
	regionName?:string;
	npcName?:string;
	exchangeCost?:number;
	barterQty?:number;
	barterInitCycle?:number;
}