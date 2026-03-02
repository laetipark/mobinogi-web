package com.example.mobinogi.controller.auth;

import com.example.mobinogi.dto.auth.AuthResponse;
import com.example.mobinogi.dto.auth.KakaoLoginRequest;
import com.example.mobinogi.dto.user.ProfileUpdateRequest;
import com.example.mobinogi.dto.user.UserDto;
import com.example.mobinogi.service.user.UserService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Authentication and profile APIs.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController{

	/** User authentication/profile service. */
	private final UserService userService;

	/** JWT utility for validation and user-id extraction. */
	private final JwtUtil jwtUtil;

	/**
	 * Checks whether a user exists by Kakao ID.
	 *
	 * @param kakaoId Kakao user ID
	 * @return existence response
	 */
	@GetMapping("/kakao/check")
	public ResponseEntity<?> checkKakaoUser(@RequestParam Long kakaoId){
		try{
			boolean exists = userService.existsByKakaoId(kakaoId);
			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("exists", exists);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", "Failed to check Kakao user.");
			return ResponseEntity.status(500).body(errorResponse);
		}
	}

	/**
	 * Performs Kakao login.
	 *
	 * @param request Kakao login payload
	 * @return authentication response
	 */
	@PostMapping("/kakao")
	public ResponseEntity<AuthResponse> kakaoLogin(@RequestBody KakaoLoginRequest request){
		try{
			AuthResponse response = userService.kakaoLogin(request);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			System.err.println("Kakao login failed: " + e.getMessage());
			e.printStackTrace();

			AuthResponse errorResponse = AuthResponse.builder()
				.success(false)
				.message("Kakao login failed: " + e.getMessage())
				.build();

			return ResponseEntity.status(500).body(errorResponse);
		}
	}

	/**
	 * Returns current user profile from bearer token.
	 *
	 * @param authHeader authorization header
	 * @return current user payload
	 */
	@GetMapping("/me")
	public ResponseEntity<?> getCurrentUser(@RequestHeader(value = "Authorization", required = false) String authHeader){
		try{
			String token = requireValidToken(authHeader);
			Long userId = jwtUtil.getUserIdFromToken(token);
			UserDto user = userService.getUserById(userId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("user", user);
			response.put("token", token);

			return ResponseEntity.ok(response);
		}catch(SecurityException e){
			return ResponseEntity.status(401).body(failure(e.getMessage()));
		}catch(Exception e){
			System.err.println("Failed to fetch current user: " + e.getMessage());

			Map<String, Object> errorResponse = failure("Failed to fetch current user.");
			errorResponse.put("error", e.getMessage());
			return ResponseEntity.status(500).body(errorResponse);
		}
	}

	/**
	 * Updates current user profile.
	 *
	 * @param authHeader authorization header
	 * @param request profile update payload
	 * @return updated user payload
	 */
	@PutMapping("/profile")
	public ResponseEntity<?> updateProfile(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody ProfileUpdateRequest request
	){
		try{
			String token = requireValidToken(authHeader);
			Long userId = jwtUtil.getUserIdFromToken(token);
			UserDto updatedUser = userService.updateProfile(userId, request.getNickname(), request.getProfileImage());

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "Profile updated.");
			response.put("user", updatedUser);

			return ResponseEntity.ok(response);
		}catch(SecurityException e){
			return ResponseEntity.status(401).body(failure(e.getMessage()));
		}catch(Exception e){
			System.err.println("Failed to update profile: " + e.getMessage());
			return ResponseEntity.status(400).body(failure(e.getMessage()));
		}
	}

	/**
	 * Validates authorization header and returns token.
	 *
	 * @param authHeader authorization header
	 * @return validated JWT token
	 */
	private String requireValidToken(String authHeader){
		if(authHeader == null || !authHeader.startsWith("Bearer ")){
			throw new SecurityException("Authentication token is required.");
		}

		String token = authHeader.substring(7);
		if(!jwtUtil.validateToken(token)){
			throw new SecurityException("Invalid token.");
		}
		return token;
	}

	/**
	 * Builds failure response body.
	 *
	 * @param message failure message
	 * @return failure response map
	 */
	private Map<String, Object> failure(String message){
		Map<String, Object> body = new HashMap<>();
		body.put("success", false);
		body.put("message", message);
		return body;
	}
}
