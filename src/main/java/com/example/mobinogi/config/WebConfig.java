package com.example.mobinogi.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 웹 설정 클래스
 * CORS 및 기타 웹 관련 설정을 담당합니다.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer{
	
	/**
	 * CORS 설정
	 * 개발 중에는 localhost:3000에서의 요청을 허용합니다.
	 */
	@Override
	public void addCorsMappings(CorsRegistry registry){
		registry.addMapping("/**")  // 모든 경로에 CORS 허용
			.allowedOrigins(
				"http://localhost:3000",  // 개발 서버
				"http://127.0.0.1:3000"   // 대체 로컬 주소
			)
			.allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
			.allowedHeaders("*")
			.allowCredentials(true)
			.maxAge(3600);
	}
}
