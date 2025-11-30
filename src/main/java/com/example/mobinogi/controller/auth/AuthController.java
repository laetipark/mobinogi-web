package com.example.mobinogi.controller.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000") // React 개발 서버와 CORS 허용
public class AuthController{
	
	private final ObjectMapper objectMapper;
	
	public AuthController(ObjectMapper objectMapper){
		this.objectMapper = objectMapper;
	}
	
	/**
	 * 카카오 로그인 API 엔드포인트
	 * 프론트엔드에서 카카오 사용자 정보를 전송받아 처리합니다.
	 */
	@RequestMapping(value = "/kakao", method = RequestMethod.POST)
	public ResponseEntity<?> kakaoLogin(@RequestBody Map<String, Object> kakaoUserInfo){
		try{
			// 카카오 사용자 정보 로그 출력
			System.out.println("Received Kakao user info: " + objectMapper.writeValueAsString(kakaoUserInfo));
			
			// 사용자 정보 추출
			Long kakaoId = Long.valueOf(kakaoUserInfo.get("kakaoId").toString());
			String nickname = (String) kakaoUserInfo.get("nickname");
			String email = (String) kakaoUserInfo.get("email");
			String profileImage = (String) kakaoUserInfo.get("profileImage");
			
			// 여기서 실제로는 데이터베이스에 사용자 정보를 저장하거나 업데이트해야 합니다
			// 현재는 단순히 성공 응답을 반환합니다
			
			// 응답 데이터 구성
			Map<String, Object> userInfo = new HashMap<>();
			userInfo.put("kakaoId", kakaoId);
			userInfo.put("nickname", nickname);
			userInfo.put("email", email != null ? email : "");
			userInfo.put("profileImage", profileImage != null ? profileImage : "");
			userInfo.put("provider", "kakao");
			
			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "카카오 로그인이 성공적으로 처리되었습니다.");
			response.put("user", userInfo);
			
			// 임시 토큰 생성 (실제 JWT 구현까지는 임시로 사용)
			String tempToken = "temp_token_" + kakaoId + "_" + System.currentTimeMillis();
			response.put("token", tempToken);
			
			// JWT 토큰을 생성해야 하는 경우 여기서 처리
			// String token = jwtUtil.generateToken(kakaoId.toString());
			// response.put("token", token);
			
			return ResponseEntity.ok()
				.header("Content-Type", "application/json")
				.body(response);
			
		}catch(Exception e){
			System.err.println("카카오 로그인 처리 중 오류 발생: " + e.getMessage());
			e.printStackTrace();
			
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", "카카오 로그인 처리 중 오류가 발생했습니다.");
			errorResponse.put("error", e.getMessage());
			
			return ResponseEntity.status(500).body(errorResponse);
		}
	}
	
	/**
	 * 사용자 정보 조회 API 엔드포인트
	 * 인증된 사용자의 정보를 반환합니다.
	 */
	@RequestMapping(value = "/me", method = RequestMethod.GET)
	public ResponseEntity<?> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authToken){
		try{
			// 실제로는 JWT 토큰을 검증하고 사용자 정보를 조회해야 합니다
			// 현재는 임시 응답을 반환합니다
			
			Map<String, Object> response = new HashMap<>();
			if(authToken != null && !authToken.isEmpty()){
				// 임시로 토큰이 있으면 성공으로 처리
				Map<String, Object> userInfo = new HashMap<>();
				userInfo.put("kakaoId", "temp_user_id");
				userInfo.put("nickname", "임시 사용자");
				userInfo.put("email", "temp@example.com");
				userInfo.put("provider", "kakao");
				
				response.put("success", true);
				response.put("user", userInfo);
				response.put("token", authToken.replace("Bearer ", "")); // 토큰도 함께 반환
			}else{
				response.put("success", false);
				response.put("message", "인증 토큰이 필요합니다.");
			}
			
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
