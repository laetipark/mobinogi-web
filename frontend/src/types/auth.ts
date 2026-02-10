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

export interface ExtendedAuthContextType extends AuthContextType{
	kakaoLogin:() => void;
	kakaoLogout:() => void;
	isKakaoLoggedIn:boolean;
	kakaoLoading:boolean;
	kakaoError:string | null;
	isNewUser:boolean;
	clearNewUserFlag:() => void;
	pendingKakaoUser:PendingKakaoUser | null;
	completeKakaoRegistration:(nickname:string) => Promise<void>;
	checkLoginStatus:() => Promise<void>;
}

export interface PendingKakaoUser{
	kakaoId:number;
	email?:string;
	profileImage?:string;
}

export interface ProfileUpdateRequest{
	nickname?:string;
	profileImage?:string;
}
