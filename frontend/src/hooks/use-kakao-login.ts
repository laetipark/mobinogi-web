import {useState, useEffect} from "react";
import axios from "axios";
import {KakaoUser, KakaoLoginRequest, AuthResponse} from "../types/kakao";
import type {User, PendingKakaoUser} from "../types";

export const useKakaoLogin = () => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [isNewUser, setIsNewUser] = useState<boolean>(false);
	const [pendingKakaoUser, setPendingKakaoUser] = useState<PendingKakaoUser | null>(null);

	// Initialize Kakao SDK
	useEffect(() => {
		const initKakao = () => {
			if(window.Kakao && !window.Kakao.isInitialized()){
				const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY;
				if(kakaoKey){
					window.Kakao.init(kakaoKey);
					console.log("Kakao SDK initialized");
				}else{
					console.error("Kakao JS Key not found. Check your .env file.");
				}
			}
		};

		// Wait for SDK to load
		if(window.Kakao){
			initKakao();
		}else{
			const checkKakaoLoaded = setInterval(() => {
				if(window.Kakao){
					initKakao();
					clearInterval(checkKakaoLoaded);
				}
			}, 100);

			return () => clearInterval(checkKakaoLoaded);
		}

		// Check existing login status
		const token = localStorage.getItem("accessToken");
		if(token){
			checkLoginStatus();
		}
	}, []);

	// Check login status
	const checkLoginStatus = async() => {
		try{
			const token = localStorage.getItem("accessToken");
			if(!token) return;

			const response = await axios.get("/auth/me", {
				headers : {Authorization : `Bearer ${token}`}
			});

			if(response.data.success){
				setUser(response.data.user);
				setIsLoggedIn(true);
			}
		}catch(error){
			console.error("Login status check failed:", error);
			localStorage.removeItem("accessToken");
			setIsLoggedIn(false);
			setUser(null);
		}
	};

	// Kakao login
	const kakaoLogin = () => {
		if(!window.Kakao){
			setError("Kakao SDK not loaded.");
			return;
		}

		if(!window.Kakao.isInitialized()){
			setError("Kakao SDK not initialized. Check environment variables.");
			return;
		}

		setIsLoading(true);
		setError(null);

		window.Kakao.Auth.login({
			success : async(authObj:any) => {
				try{
					console.log("Kakao login success", authObj);

					// Get user info
					window.Kakao.API.request({
						url : "/v2/user/me",
						success : async(kakaoUser:KakaoUser) => {
							console.log("Kakao user info:", kakaoUser);
							await checkAndProcessKakaoUser(kakaoUser);
						},
						fail : (err:any) => {
							console.error("Failed to get user info", err);
							setError("Failed to get user information.");
							setIsLoading(false);
						}
					});
				}catch(error){
					console.error("Login processing error:", error);
					setError("An error occurred during login.");
					setIsLoading(false);
				}
			},
			fail : (err:any) => {
				console.error("Kakao login failed", err);
				setError("Kakao login failed.");
				setIsLoading(false);
			}
		});
	};

	// 회원 존재 여부 확인 후 처리
	const checkAndProcessKakaoUser = async(kakaoUser:KakaoUser) => {
		try{
			// 서버에 회원 존재 여부 확인
			const checkResponse = await axios.get("/auth/kakao/check", {
				params : {kakaoId : kakaoUser.id}
			});

			if(checkResponse.data.exists){
				// 기존 회원이면 바로 로그인
				await sendUserInfoToServer(kakaoUser);
			}else{
				// 신규 회원이면 닉네임 입력을 위해 대기 상태로 저장
				setPendingKakaoUser({
					kakaoId : kakaoUser.id,
					email : kakaoUser.kakao_account?.email || undefined,
					profileImage : kakaoUser.kakao_account?.profile?.profile_image_url || undefined
				});
				setIsLoading(false);
			}
		}catch(error:any){
			console.error("Failed to check user:", error);
			setError("회원 확인 중 오류가 발생했습니다.");
			setIsLoading(false);
		}
	};

	// 닉네임 입력 후 회원가입 완료
	const completeKakaoRegistration = async(nickname:string) => {
		if(!pendingKakaoUser){
			throw new Error("대기 중인 카카오 사용자 정보가 없습니다.");
		}

		setIsLoading(true);
		setError(null);

		try{
			const userInfo:KakaoLoginRequest = {
				kakaoId : pendingKakaoUser.kakaoId,
				nickname : nickname,
				email : pendingKakaoUser.email,
				profileImage : pendingKakaoUser.profileImage
			};

			console.log("Completing registration with:", userInfo);

			const response = await axios.post<AuthResponse>(
				"/auth/kakao",
				userInfo
			);

			if(response.data.success && response.data.user && response.data.token){
				// Save JWT token
				localStorage.setItem("accessToken", response.data.token);

				// Set user info
				setUser(response.data.user as User);
				setIsLoggedIn(true);
				setIsNewUser(true);
				setPendingKakaoUser(null);

				console.log("Registration completed:", response.data.user);
			}else{
				throw new Error(response.data.message || "회원가입에 실패했습니다.");
			}
		}catch(error:any){
			console.error("Failed to complete registration:", error);
			const message = error.response?.data?.message || error.message || "회원가입 중 오류가 발생했습니다.";
			setError(message);
			throw new Error(message);
		}finally{
			setIsLoading(false);
		}
	};

	// Send user info to server (기존 회원용)
	const sendUserInfoToServer = async(kakaoUser:KakaoUser) => {
		try{
			const userInfo:KakaoLoginRequest = {
				kakaoId : kakaoUser.id,
				nickname : kakaoUser.kakao_account?.profile?.nickname || "User",
				email : kakaoUser.kakao_account?.email || undefined,
				profileImage : kakaoUser.kakao_account?.profile?.profile_image_url || undefined
			};

			console.log("Sending user info to server:", userInfo);

			const response = await axios.post<AuthResponse>(
				"/auth/kakao",
				userInfo
			);

			if(response.data.success && response.data.user && response.data.token){
				// Save JWT token
				localStorage.setItem("accessToken", response.data.token);

				// Set user info
				setUser(response.data.user as User);
				setIsLoggedIn(true);
				setIsNewUser(false);

				console.log("Login completed:", response.data.user);
			}else{
				throw new Error(response.data.message || "Server authentication failed");
			}
		}catch(error:any){
			console.error("Failed to send to server:", error);
			if(error.code === "ECONNREFUSED"){
				setError("Cannot connect to server. Please check if server is running.");
			}else{
				setError(error.response?.data?.message || "Failed to connect to server.");
			}
		}finally{
			setIsLoading(false);
		}
	};

	// Logout
	const logout = () => {
		if(window.Kakao && window.Kakao.Auth.getAccessToken()){
			window.Kakao.Auth.logout(() => {
				handleLogoutComplete();
			});
		}else{
			handleLogoutComplete();
		}
	};

	const handleLogoutComplete = () => {
		localStorage.removeItem("accessToken");
		setUser(null);
		setIsLoggedIn(false);
		setIsNewUser(false);
		setPendingKakaoUser(null);
		setError(null);
		console.log("Logout completed");
	};

	const clearNewUserFlag = () => {
		setIsNewUser(false);
	};

	const clearPendingKakaoUser = () => {
		setPendingKakaoUser(null);
	};

	return {
		user,
		isLoggedIn,
		isLoading,
		error,
		isNewUser,
		pendingKakaoUser,
		kakaoLogin,
		logout,
		checkLoginStatus,
		clearNewUserFlag,
		clearPendingKakaoUser,
		completeKakaoRegistration
	};
};
