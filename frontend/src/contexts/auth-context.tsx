import React, {createContext, useState, useEffect, ReactNode} from "react";
import {User, ExtendedAuthContextType} from "../types";
import {storage} from "../utils/helpers";
import {useKakaoLogin} from "../hooks/use-kakao-login";
import axios from "axios";
import {config} from "../config/env";

export const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

interface AuthProviderProps{
	children:ReactNode;
}

// axios 기본 설정
axios.defaults.baseURL = config.api.baseUrl;

// 요청 인터셉터 - 토큰 자동 추가
axios.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem("accessToken");
		if(token){
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// 응답 인터셉터 - 401 에러 처리
axios.interceptors.response.use(
	(response) => response,
	(error) => {
		// 아이템 관련 API는 인증 에러 무시
		const isItemAPI = error.config?.url?.includes('/item/');

		if(error.response?.status === 401 && !isItemAPI){
			localStorage.removeItem("accessToken");
			window.location.href = "/login";
		}
		return Promise.reject(error);
	}
);

export const AuthProvider:React.FC<AuthProviderProps> = ({children}) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState<boolean>(true);

	// 카카오 로그인 훅 사용
	const {
		user : kakaoUser,
		isLoggedIn : isKakaoLoggedIn,
		isLoading : kakaoLoading,
		error : kakaoError,
		isNewUser,
		pendingKakaoUser,
		kakaoLogin : performKakaoLogin,
		logout : performKakaoLogout,
		checkLoginStatus,
		clearNewUserFlag,
		completeKakaoRegistration : performCompleteKakaoRegistration
	} = useKakaoLogin();

	useEffect(() => {
		const init = async() => {
			// 기존 로컬 사용자 확인
			const savedUser = storage.get<User>("user");
			if(savedUser){
				setUser(savedUser);
			}

			// 카카오 로그인 상태 확인 (완료될 때까지 대기)
			await checkLoginStatus();

			setLoading(false);
		};
		init();
	}, []);

	// 카카오 사용자 정보가 변경되면 전체 사용자 상태 업데이트
	useEffect(() => {
		if(kakaoUser && isKakaoLoggedIn){
			setUser(kakaoUser);
		}else if(!isKakaoLoggedIn && user?.provider === "kakao"){
			setUser(null);
		}
	}, [kakaoUser, isKakaoLoggedIn]);

	const login = async(username:string, password:string):Promise<User> => {
		setLoading(true);

		try{
			// 서버 API 호출로 변경 (기존 목업 대신)
			const response = await axios.post("/auth/login", {
				username,
				password
			});

			if(response.data.success && response.data.user && response.data.token){
				const userData = response.data.user;

				// 토큰 저장
				localStorage.setItem("accessToken", response.data.token);

				setUser(userData);
				storage.set("user", userData);

				return userData;
			}else{
				throw new Error(response.data.message || "Login failed");
			}
		}catch(error:any){
			// 서버가 없을 때를 위한 폴백
			if(error.code === "ECONNREFUSED" || error.response?.status >= 500){
				console.warn("Server not available, using mock login");
				await new Promise(resolve => setTimeout(resolve, 1000));

				if(!username || !password){
					throw new Error("Username and password are required");
				}

				if(username.length < 3){
					throw new Error("Username must be at least 3 characters");
				}

				if(password.length < 6){
					throw new Error("Password must be at least 6 characters");
				}

				const userData:User = {
					id : Date.now(),
					username,
					email : "laeti@example.com",
					createdAt : new Date().toISOString(),
					provider : "local"
				};

				setUser(userData);
				storage.set("user", userData);

				return userData;
			}
			throw error;
		}finally{
			setLoading(false);
		}
	};

	const register = async(username:string, email:string, password:string):Promise<User> => {
		setLoading(true);

		try{
			// 서버 API 호출
			const response = await axios.post("/auth/register", {
				username,
				email,
				password
			});

			if(response.data.success && response.data.user && response.data.token){
				const userData = response.data.user;

				// 토큰 저장
				localStorage.setItem("accessToken", response.data.token);

				setUser(userData);
				storage.set("user", userData);

				return userData;
			}else{
				throw new Error(response.data.message || "Registration failed");
			}
		}catch(error:any){
			// 서버가 없을 때를 위한 폴백
			if(error.code === "ECONNREFUSED" || error.response?.status >= 500){
				console.warn("Server not available, using mock registration");
				await new Promise(resolve => setTimeout(resolve, 1200));

				if(!username || !email || !password){
					throw new Error("All fields are required");
				}

				if(username.length < 3){
					throw new Error("Username must be at least 3 characters");
				}

				if(!/\S+@\S+\.\S+/.test(email)){
					throw new Error("Please enter a valid email address");
				}

				if(password.length < 6){
					throw new Error("Password must be at least 6 characters");
				}

				const userData:User = {
					id : Date.now(),
					username,
					email,
					createdAt : new Date().toISOString(),
					provider : "local"
				};

				setUser(userData);
				storage.set("user", userData);

				return userData;
			}
			throw error;
		}finally{
			setLoading(false);
		}
	};

	const logout = ():void => {
		// 카카오 로그인인 경우 카카오 로그아웃도 함께 실행
		if(user?.provider === "kakao"){
			performKakaoLogout();
		}

		setUser(null);
		storage.remove("user");
		localStorage.removeItem("accessToken");
	};

	// 카카오 전용 로그인/로그아웃 함수
	const kakaoLogin = () => {
		performKakaoLogin();
	};

	const kakaoLogout = () => {
		performKakaoLogout();
		setUser(null);
		storage.remove("user");
	};

	// 카카오 회원가입 완료
	const completeKakaoRegistration = async(nickname:string) => {
		await performCompleteKakaoRegistration(nickname);
	};

	const value:ExtendedAuthContextType = {
		user,
		login,
		register,
		logout,
		loading : loading || kakaoLoading,
		kakaoLogin,
		kakaoLogout,
		isKakaoLoggedIn,
		kakaoLoading,
		kakaoError,
		isNewUser,
		clearNewUserFlag,
		pendingKakaoUser,
		completeKakaoRegistration,
		checkLoginStatus
	};

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	);
};
