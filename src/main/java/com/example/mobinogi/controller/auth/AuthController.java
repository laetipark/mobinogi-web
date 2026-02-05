package com.example.mobinogi.controller.auth;

import com.example.mobinogi.dto.auth.AuthResponse;
import com.example.mobinogi.dto.auth.KakaoLoginRequest;
import com.example.mobinogi.dto.user.UserDto;
import com.example.mobinogi.service.user.UserService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController{
	
	private final UserService userService;
	private final JwtUtil jwtUtil;
	
	@PostMapping("/kakao")
	public ResponseEntity<AuthResponse> kakaoLogin(@RequestBody KakaoLoginRequest request){
		try{
			AuthResponse response = userService.kakaoLogin(request);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			System.err.println("카카오 로그인 처리 중 오류 발생: " + e.getMessage());
			e.printStackTrace();
			
			AuthResponse errorResponse = AuthResponse.builder()
				.success(false)
				.message("카카오 로그인 처리 중 오류가 발생했습니다: " + e.getMessage())
				.build();
			
			return ResponseEntity.status(500).body(errorResponse);
		}
	}
	
	@GetMapping("/me")
	public ResponseEntity<?> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authHeader){
		try{
			if(authHeader == null || !authHeader.startsWith("Bearer ")){
				Map<String, Object> errorResponse = new HashMap<>();
				errorResponse.put("success", false);
				errorResponse.put("message", "인증 토큰이 필요합니다.");
				return ResponseEntity.status(401).body(errorResponse);
			}
			
			String token = authHeader.substring(7);
			
			if(!jwtUtil.validateToken(token)){
				Map<String, Object> errorResponse = new HashMap<>();
				errorResponse.put("success", false);
				errorResponse.put("message", "유효하지 않은 토큰입니다.");
				return ResponseEntity.status(401).body(errorResponse);
			}
			
			Long userId = jwtUtil.getUserIdFromToken(token);
			UserDto user = userService.getUserById(userId);
			
			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("user", user);
			response.put("token", token);
			
			return ResponseEntity.ok(response);
			
		}catch(Exception e){
			System.err.println("사용자 정보 조회 중 오류 발생: " + e.getMessage());
			
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", "사용자 정보 조회 중 오류가 발생했습니다.");
			errorResponse.put("error", e.getMessage());
			
			return ResponseEntity.status(500).body(errorResponse);
		}
	}
}
