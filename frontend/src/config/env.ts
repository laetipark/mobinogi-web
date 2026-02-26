/**
 * 환경 변수 설정
 * Vite의 환경 변수를 타입 안전하게 사용하기 위한 설정 파일
 */
import type {AppConfig} from "../types";

// 환경변수에서 값 가져오기 (타입 안전성 보장)
const getEnvVar = (name:string, defaultValue:string = ""):string => {
	return import.meta.env[name] || defaultValue;
};

const getBooleanEnvVar = (name:string, defaultValue:boolean = false):boolean => {
	const value = import.meta.env[name];
	return value === "true" || (value === undefined && defaultValue);
};

// 애플리케이션 설정
export const config:AppConfig = {
	app : {
		title : getEnvVar("VITE_APP_TITLE", "Sexynogi"),
		env : getEnvVar("VITE_APP_ENV", "development")
	},
	api : {
		baseUrl : getEnvVar("VITE_API_BASE_URL", getEnvVar("VITE_API_PREFIX", "/api")),
		get fullUrl(){
			return (this.baseUrl || getEnvVar("VITE_API_PREFIX", "/api")).replace(/\/+$/, "");
		}
	},
	kakao : {
		jsKey : getEnvVar("VITE_KAKAO_JS_KEY", ""),
		redirectUri : getEnvVar("VITE_KAKAO_REDIRECT_URI", "http://localhost:3000/auth/kakao/callback")
	},
	features : {
		enableDevTools : getBooleanEnvVar("VITE_ENABLE_DEV_TOOLS", false),
		enableDebugLogs : getBooleanEnvVar("VITE_ENABLE_DEBUG_LOGS", false),
		enableSourceMap : getBooleanEnvVar("VITE_ENABLE_SOURCEMAP", false),
		secureMode : getBooleanEnvVar("VITE_SECURE_MODE", false)
	},
	websocket : {
		url : getEnvVar("VITE_WEBSOCKET_URL", "ws://localhost:8080/ws")
	},
	external : {
		googleAnalyticsId : getEnvVar("VITE_GOOGLE_ANALYTICS_ID", ""),
		sentryDsn : getEnvVar("VITE_SENTRY_DSN", "")
	}
};

// 디버그 로그 함수
export const debugLog = (...args:any[]) => {
	if(config.features.enableDebugLogs){
		console.log("[DEBUG]", ...args);
	}
};

export default config;
