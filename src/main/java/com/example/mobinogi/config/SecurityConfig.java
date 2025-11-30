package com.example.mobinogi.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.beans.factory.annotation.Autowired;

@Configuration
@EnableWebSecurity
public class SecurityConfig{
	
	@Autowired
	private CorsConfigurationSource corsConfigurationSource;
	
	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception{
		http
			.csrf(AbstractHttpConfigurer::disable)
			.cors(cors -> cors.configurationSource(corsConfigurationSource))
			.authorizeHttpRequests(auth -> auth
				// CORS preflight 요청 허용
				.requestMatchers("OPTIONS", "/**").permitAll()
				// 게임 관련 API는 모든 접근 허용 (인증 불필요)
				.requestMatchers("/item/**", "/barter/**", "/guild/**", "/event/**").permitAll()
				// 인증 관련 API는 모든 접근 허용
				.requestMatchers("/api/auth/**").permitAll()
				// /rank/** 경로는 로컬에서만 접근 허용
				.requestMatchers("/rank/**").access((authentication, context) -> {
					String clientIp = getClientIp(context.getRequest());
					boolean isLocalhost = isLocalhostIp(clientIp);
					return new org.springframework.security.authorization.AuthorizationDecision(isLocalhost);
				})
				// 나머지 요청은 일단 허용 (개발 단계에서)
				.anyRequest().permitAll()
			)
			.httpBasic(AbstractHttpConfigurer::disable); // HTTP Basic Authentication 비활성화
		
		return http.build();
	}
	
	/**
	 * 클라이언트 IP를 추출하는 메서드
	 * X-Forwarded-For, X-Real-IP 헤더를 고려하여 실제 클라이언트 IP를 반환
	 */
	private String getClientIp(jakarta.servlet.http.HttpServletRequest request){
		String xForwardedFor = request.getHeader("X-Forwarded-For");
		if(xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)){
			// X-Forwarded-For 헤더에서 첫 번째 IP (실제 클라이언트 IP)
			return xForwardedFor.split(",")[0].trim();
		}
		
		String xRealIp = request.getHeader("X-Real-IP");
		if(xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)){
			return xRealIp;
		}
		
		String xOriginalForwarded = request.getHeader("X-Original-Forwarded-For");
		if(xOriginalForwarded != null && !xOriginalForwarded.isEmpty() && !"unknown".equalsIgnoreCase(xOriginalForwarded)){
			return xOriginalForwarded.split(",")[0].trim();
		}
		
		// 기본적으로 request.getRemoteAddr() 사용
		return request.getRemoteAddr();
	}
	
	/**
	 * IP가 localhost인지 확인하는 메서드
	 * IPv4: 127.0.0.1, IPv6: ::1, 0:0:0:0:0:0:0:1
	 */
	private boolean isLocalhostIp(String ip){
		if(ip == null || ip.isEmpty()){
			return false;
		}
		
		// IPv4 localhost 체크
		if("127.0.0.1".equals(ip) || "localhost".equalsIgnoreCase(ip)){
			return true;
		}
		
		// IPv6 localhost 체크
		if("::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip)){
			return true;
		}
		
		// 127.x.x.x 대역 체크 (loopback range)
		if(ip.startsWith("127.")){
			return true;
		}
		
		return false;
	}
}
