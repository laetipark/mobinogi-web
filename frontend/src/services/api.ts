import axios, {AxiosInstance, AxiosResponse, AxiosError} from "axios";
import {config, debugLog} from "../config/env";

/**
 * API 서비스 클래스
 * 환경변수를 활용한 API 통신 설정
 */
class ApiService{
	private api:AxiosInstance;
	
	constructor(){
		// Axios 인스턴스 생성
		this.api = axios.create({
			baseURL : config.api.fullUrl,
			timeout : 10000,
			withCredentials : false, // 기본 인증 비활성화
			headers : {
				"Content-Type" : "application/json"
			}
		});
		
		// 요청 인터셉터
		this.api.interceptors.request.use(
			(config) => {
				const token = localStorage.getItem("accessToken");
				if(token){
					config.headers.Authorization = `Bearer ${token}`;
				}
				debugLog("🚀 API Request:", config.method?.toUpperCase(), config.url);
				debugLog("📤 Request Data:", config.data);
				return config;
			},
			(error) => {
				debugLog("❌ Request Error:", error);
				return Promise.reject(error);
			}
		);
		
		// 응답 인터셉터
		this.api.interceptors.response.use(
			(response:AxiosResponse) => {
				debugLog("✅ API Response:", response.status, response.config.url);
				debugLog("📥 Response Data:", response.data);
				return response;
			},
			(error:AxiosError) => {
				debugLog("❌ Response Error:", error.response?.status, error.config?.url);
				debugLog("📥 Error Data:", error.response?.data);
				
				const status:number = error.response?.status as number;
				// 에러 처리
				if(status === 401){
					// 인증 에러 처리
					console.warn("Authentication required");
				}else if(status === 403){
					// 권한 에러 처리
					console.warn("Access forbidden");
				}else if(status >= 500){
					// 서버 에러 처리
					console.error("Server error occurred");
				}
				
				return Promise.reject(error);
			}
		);
	}
	
	// GET 요청
	async get<T = any>(url:string, params?:any):Promise<T>{
		const response = await this.api.get(url, {params});
		return response.data;
	}
	
	// POST 요청
	async post<T = any>(url:string, data?:any):Promise<T>{
		const response = await this.api.post(url, data);
		return response.data;
	}
	
	// PUT 요청
	async put<T = any>(url:string, data?:any):Promise<T>{
		const response = await this.api.put(url, data);
		return response.data;
	}
	
	// DELETE 요청
	async delete<T = any>(url:string):Promise<T>{
		const response = await this.api.delete(url);
		return response.data;
	}
	
	// PATCH 요청
	async patch<T = any>(url:string, data?:any):Promise<T>{
		const response = await this.api.patch(url, data);
		return response.data;
	}
	
	// 파일 업로드
	async upload<T = any>(url:string, file:File, onUploadProgress?:(progress:number) => void):Promise<T>{
		const formData = new FormData();
		formData.append("file", file);
		
		const response = await this.api.post(url, formData, {
			headers : {
				"Content-Type" : "multipart/form-data"
			},
			onUploadProgress : (progressEvent) => {
				if(onUploadProgress && progressEvent.total){
					const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
					onUploadProgress(progress);
				}
			}
		});
		
		return response.data;
	}
}

// API 서비스 인스턴스 생성 및 내보내기
export const apiService = new ApiService();
export default apiService;