// Vite 환경 변수 타입 정의
interface ImportMetaEnv{
	// 앱 기본 설정
	readonly VITE_APP_TITLE:string;
	readonly VITE_APP_ENV:string;
	
	// API 설정
	readonly VITE_API_BASE_URL:string;
	readonly VITE_API_PREFIX:string;
	
	// Kakao API 설정
	readonly VITE_KAKAO_JS_KEY:string;
	readonly VITE_KAKAO_REDIRECT_URI:string;
	
	// 개발 서버 설정
	readonly VITE_DEV_SERVER_PORT:string;
	readonly VITE_DEV_SERVER_HOST:string;
	
	// 기능 플래그
	readonly VITE_ENABLE_DEV_TOOLS:string;
	readonly VITE_ENABLE_SOURCEMAP:string;
	readonly VITE_ENABLE_DEBUG_LOGS:string;
	
	// 외부 서비스
	readonly VITE_WEBSOCKET_URL:string;
	readonly VITE_GOOGLE_ANALYTICS_ID:string;
	readonly VITE_SENTRY_DSN:string;
	
	// 빌드 설정
	readonly VITE_BUILD_MINIFY:string;
	readonly VITE_BUILD_CHUNK_SIZE_WARNING_LIMIT:string;
	
	// 보안 설정
	readonly VITE_SECURE_MODE:string;
}

interface ImportMeta{
	readonly env:ImportMetaEnv;
}

// 전역 변수 타입 정의
declare global{
	const __APP_ENV__:string;
	const __DEV__:boolean;
	const __PROD__:boolean;
}