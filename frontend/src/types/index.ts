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