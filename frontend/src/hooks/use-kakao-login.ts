import {useState, useEffect} from "react";
import axios from "axios";
import {KakaoUser, KakaoLoginRequest, AuthResponse} from "../types/kakao";
import {User} from "../types";

export const useKakaoLogin = () => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [isNewUser, setIsNewUser] = useState<boolean>(false);
	
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
			
			const apiUrl = import.meta.env.VITE_API_URL;
			const response = await axios.get(`${apiUrl}/api/auth/me`, {
				headers : {Authorization : `Bearer ${token}`}
			});
			
			if(response.data.success){
				setUser(response.data.user);
				setIsLoggedIn(true);
			}
		}catch(error){
			console.error("Login status check failed:", error);
			localStorage.removeItem("accessToken");
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
							await sendUserInfoToServer(kakaoUser);
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
	
	// Send user info to server
	const sendUserInfoToServer = async(kakaoUser:KakaoUser) => {
		try{
			const userInfo:KakaoLoginRequest = {
				kakaoId : kakaoUser.id,
				nickname : kakaoUser.kakao_account?.profile?.nickname || "User",
				email : kakaoUser.kakao_account?.email || undefined,
				profileImage : kakaoUser.kakao_account?.profile?.profile_image_url || undefined
			};
			
			console.log("Sending user info to server:", userInfo);
			
			const apiUrl = import.meta.env.VITE_API_URL;
			const response = await axios.post<AuthResponse>(
				`${apiUrl}/api/auth/kakao`,
				userInfo
			);
			
			if(response.data.success && response.data.user && response.data.token){
				// Save JWT token
				localStorage.setItem("accessToken", response.data.token);

				// Set user info
				setUser(response.data.user as User);
				setIsLoggedIn(true);
				setIsNewUser(response.data.isNewUser || false);

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
			window.Kakao.API.request({
				url : "/v1/user/unlink",
				success : () => {
					window.Kakao.Auth.logout(() => {
						handleLogoutComplete();
					});
				},
				fail : () => {
					// Even if unlink fails, proceed with logout
					if(window.Kakao.Auth.logout){
						window.Kakao.Auth.logout(() => {
							handleLogoutComplete();
						});
					}else{
						handleLogoutComplete();
					}
				}
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
		setError(null);
		console.log("Logout completed");
	};

	const clearNewUserFlag = () => {
		setIsNewUser(false);
	};
	
	return {
		user,
		isLoggedIn,
		isLoading,
		error,
		isNewUser,
		kakaoLogin,
		logout,
		checkLoginStatus,
		clearNewUserFlag
	};
};
