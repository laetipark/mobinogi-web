// 카카오 SDK 관련 타입 정의
declare global{
	interface Window{
		Kakao:{
			init:(key:string) => void;
			isInitialized:() => boolean;
			Auth:{
				login:(options:{
					success:(authObj:any) => void;
					fail:(err:any) => void;
					scope?:string;
				}) => void;
				logout:(callback?:() => void) => void;
				getAccessToken:() => string | null;
			};
			API:{
				request:(options:{
					url:string;
					success:(res:any) => void;
					fail?:(err:any) => void;
				}) => void;
			};
		};
	}
}

export interface KakaoUser{
	id:number;
	kakao_account:{
		profile:{
			nickname:string;
			profile_image_url?:string;
			thumbnail_image_url?:string;
		};
		email?:string;
		age_range?:string;
		birthday?:string;
		gender?:string;
	};
}

export interface KakaoAuthResponse{
	access_token:string;
	expires_in:number;
	refresh_token:string;
	scope:string;
	token_type:string;
}

export interface KakaoLoginRequest{
	kakaoId:number;
	nickname:string;
	email?:string;
	profileImage?:string;
}

export interface AuthResponse{
	success:boolean;
	message:string;
	user?:{
		id:number;
		userId?:number;
		username:string;
		email?:string;
		nickname?:string;
		profileImage?:string;
		provider:"kakao" | "local";
		kakaoId?:string;
		createdAt:string;
	};
	token?:string;
	isNewUser?:boolean;
}