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

export interface Controller{
	id:number;
	name:string;
	type:string;
	battery:number;
	status:"Connected" | "Disconnected" | "Low Battery";
	lastUsed:string;
	color:string;
	connection?:string;
	inputLag?:string;
	pollingRate?:string;
	range?:string;
	haptic?:string;
	adaptiveTriggers?:string;
	firmware?:string;
	stats?:ControllerStats;
}

export interface ControllerStats{
	sessions:number;
	hours:number;
	avgSession:number;
	gamesPlayed:number;
	favoriteGame:string;
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