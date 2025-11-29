/**
 * 환경 변수 설정
 * Vite의 환경 변수를 타입 안전하게 사용하기 위한 설정 파일
 */

interface AppConfig {
  app: {
    title: string;
    env: string;
  };
  api: {
    baseUrl: string;
    prefix: string;
    fullUrl: string;
  };
  kakao: {
    jsKey: string;
    redirectUri: string;
  };
  features: {
    enableDevTools: boolean;
    enableDebugLogs: boolean;
    enableSourceMap: boolean;
    secureMode: boolean;
  };
  websocket: {
    url: string;
  };
  external: {
    googleAnalyticsId: string;
    sentryDsn: string;
  };
}

// 환경변수에서 값 가져오기 (타입 안전성 보장)
const getEnvVar = (name: string, defaultValue: string = ''): string => {
  return import.meta.env[name] || defaultValue;
};

const getBooleanEnvVar = (name: string, defaultValue: boolean = false): boolean => {
  const value = import.meta.env[name];
  return value === 'true' || (value === undefined && defaultValue);
};

// 애플리케이션 설정
export const config: AppConfig = {
  app: {
    title: getEnvVar('VITE_APP_TITLE', 'Mobinogi'),
    env: getEnvVar('VITE_APP_ENV', 'development'),
  },
  api: {
    baseUrl: getEnvVar('VITE_API_BASE_URL', ''),
    prefix: getEnvVar('VITE_API_PREFIX', '/api'),
    get fullUrl() {
      return this.baseUrl + this.prefix;
    }
  },
  kakao: {
    jsKey: getEnvVar('VITE_KAKAO_JS_KEY', ''),
    redirectUri: getEnvVar('VITE_KAKAO_REDIRECT_URI', 'http://localhost:3000/auth/kakao/callback'),
  },
  features: {
    enableDevTools: getBooleanEnvVar('VITE_ENABLE_DEV_TOOLS', false),
    enableDebugLogs: getBooleanEnvVar('VITE_ENABLE_DEBUG_LOGS', false),
    enableSourceMap: getBooleanEnvVar('VITE_ENABLE_SOURCEMAP', false),
    secureMode: getBooleanEnvVar('VITE_SECURE_MODE', false),
  },
  websocket: {
    url: getEnvVar('VITE_WEBSOCKET_URL', 'ws://localhost:8080/ws'),
  },
  external: {
    googleAnalyticsId: getEnvVar('VITE_GOOGLE_ANALYTICS_ID', ''),
    sentryDsn: getEnvVar('VITE_SENTRY_DSN', ''),
  }
};

// 개발 환경 체크 헬퍼
export const isDevelopment = config.app.env === 'development';
export const isProduction = config.app.env === 'production';

// 디버그 로그 함수
export const debugLog = (...args: any[]) => {
  if (config.features.enableDebugLogs) {
    console.log('[DEBUG]', ...args);
  }
};

// Kakao SDK 로드 체크
export const isKakaoSDKLoaded = () => {
  return typeof window !== 'undefined' && window.Kakao;
};

// 타입 정의 확장 (vite-env.d.ts에서도 사용 가능)
declare global {
  const __APP_ENV__: string;
  const __DEV__: boolean;
  const __PROD__: boolean;
  
  interface Window {
    Kakao: any;
    gtag: any;
  }
}

export default config;