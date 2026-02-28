import {defineConfig, loadEnv} from "vite";
import react from "@vitejs/plugin-react";
import path, {resolve} from "path";

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
	// 환경 변수 로드
	const rootEnvDir = resolve(__dirname, "..");
	// Single source of truth for frontend env: mobinogi-web/.env.{mode}
	const env = loadEnv(mode, rootEnvDir, "");
	const isDev = mode === "development";
	const isProd = mode === "production";
	const serverPort = parseInt(
		env.VITE_DEV_SERVER_PORT || env.VITE_SERVER_PORT || "3000",
		10
	) || 3000;
	const configuredServerHost = env.VITE_DEV_SERVER_HOST || env.VITE_SERVER_HOST;
	const serverHost = isDev ? "0.0.0.0" : (configuredServerHost || "localhost");
	
	return {
		plugins : [react()],
		envDir : rootEnvDir,
		
		// 경로 alias 설정
		resolve : {
			alias : [
				{
					find : "@",
					replacement : resolve(__dirname, "src")
				},
				{
					find : "@/components",
					replacement : resolve(__dirname, "src/components")
				},
				{
					find : "@/pages",
					replacement : resolve(__dirname, "src/pages")
				},
				{
					find : "@/hooks",
					replacement : resolve(__dirname, "src/hooks")
				},
				{
					find : "@/services",
					replacement : resolve(__dirname, "src/services")
				},
				{
					find : "@/contexts",
					replacement : resolve(__dirname, "src/contexts")
				},
				{
					find : "@/types",
					replacement : resolve(__dirname, "src/types")
				},
				{
					find : "@/utils",
					replacement : resolve(__dirname, "src/utils")
				},
				{
					find : "@/styles",
					replacement : resolve(__dirname, "src/styles")
				},
				{
					find : "@/config",
					replacement : resolve(__dirname, "src/config")
				},
				{
					find : "@/assets",
					replacement : resolve(__dirname, "src/assets")
				}
			]
		},
		
		// 개발 서버 설정
		server : {
			port : serverPort,
			host : serverHost,
			open : true,
			// 개발환경: 모든 호스트 허용 (ngrok 등), production: 특정 호스트만 허용
			allowedHosts : isDev
				? true
				: [
					"localhost",
					"127.0.0.1",
					env.VITE_ALLOWED_HOST || "mobinogi.com"
				],
			proxy : {
				"/api" : {
					target : env.VITE_API_BASE_URL || "http://localhost:8080",
					changeOrigin : true,
					secure : false,
					// API 요청 로깅 (개발환경에서만)
					configure : (proxy, _options) => {
						if(isDev && env.VITE_ENABLE_DEBUG_LOGS === "true"){
							proxy.on("proxyReq", (_proxyReq, req, _res) => {
								console.log("🚀 API Request:", req.method, req.url);
							});
						}
					}
				},
				"/ws" : {
					target : env.VITE_WEBSOCKET_URL?.replace("ws://", "http://").replace("wss://", "https://") || "http://localhost:8080",
					ws : true,
					changeOrigin : true
				}
			}
		},
		
		// 프리뷰 서버 설정 (production build preview)
		preview : {
			port : serverPort,
			host : serverHost,
			open : false,
			allowedHosts : [
				"localhost",
				"127.0.0.1",
				"laetipark.me",
				"www.laetipark.me"
			]
		},
		
		// 빌드 설정
		build : {
			outDir : "dist",
			assetsDir : "assets",
			sourcemap : env.VITE_ENABLE_SOURCEMAP === "true",
			minify : isProd ? (env.VITE_BUILD_MINIFY === "true" ? "terser" : true) : false,
			target : "esnext",
			
			// 청크 크기 경고 임계값
			chunkSizeWarningLimit : parseInt(env.VITE_BUILD_CHUNK_SIZE_WARNING_LIMIT) || 500,
			
			// 롤업 옵션
			rollupOptions : {
				output : {
					// 청크 분할 전략
					manualChunks : {
						vendor : ["react", "react-dom"],
						router : ["react-router-dom"],
						utils : ["axios", "lucide-react"]
					},
					// 파일명 패턴
					chunkFileNames : isProd ? "assets/js/[name]-[hash].js" : "assets/js/[name].js",
					entryFileNames : isProd ? "assets/js/[name]-[hash].js" : "assets/js/[name].js",
					assetFileNames : isProd ? "assets/[ext]/[name]-[hash].[ext]" : "assets/[ext]/[name].[ext]"
				}
			}
		},
		
		// 환경 변수 설정
		define : {
			__APP_ENV__ : JSON.stringify(env.VITE_APP_ENV),
			__DEV__ : isDev,
			__PROD__ : isProd
		},
		
		// CSS 설정
		css : {
			devSourcemap : isDev,
			preprocessorOptions : {
				scss : {
					api : "modern-compiler", // Use modern Sass API
					silenceDeprecations : ["legacy-js-api"], // Temporarily silence warnings
					includePaths : [
						path.resolve(__dirname, "src/styles"),
						path.resolve(__dirname, "src/assets/styles")
					]
				}
			},
			modules : {
				generateScopedName : isDev
					? "[name]__[local]___[hash:base64:5]"
					: "[hash:base64:8]"
			}
		},
		
		// Base path 설정
		base : "/",
		
		// 최적화 설정
		optimizeDeps : {
			include : ["react", "react-dom", "react-router-dom", "axios"]
		}
	};
});
