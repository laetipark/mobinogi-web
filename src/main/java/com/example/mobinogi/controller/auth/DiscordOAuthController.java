package com.example.mobinogi.controller.auth;

import com.example.mobinogi.entity.User;
import com.example.mobinogi.service.user.UserService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/discord")
@RequiredArgsConstructor
public class DiscordOAuthController {

	private final UserService userService;
	private final JwtUtil jwtUtil;
	private final RestTemplate restTemplate = new RestTemplate();

	@Value("${discord.oauth.client-id}")
	private String clientId;

	@Value("${discord.oauth.client-secret}")
	private String clientSecret;

	@Value("${discord.oauth.redirect-uri}")
	private String redirectUri;

	/**
	 * Discord OAuth2 인증 URL 생성
	 */
	@GetMapping("/authorize")
	public ResponseEntity<?> getAuthorizeUrl() {
		String url = String.format(
			"https://discord.com/api/oauth2/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=identify",
			clientId,
			redirectUri
		);

		Map<String, Object> response = new HashMap<>();
		response.put("success", true);
		response.put("url", url);
		return ResponseEntity.ok(response);
	}

	/**
	 * Discord OAuth2 콜백 처리
	 */
	@PostMapping("/callback")
	public ResponseEntity<?> handleCallback(@RequestBody Map<String, String> payload, Authentication authentication) {
		try {
			String code = payload.get("code");
			if (code == null) {
				return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Authorization code missing"));
			}

			// 1. Exchange code for access token
			String accessToken = exchangeCodeForToken(code);

			// 2. Get Discord user info
			Map<String, Object> discordUser = getDiscordUser(accessToken);
			String discordId = (String) discordUser.get("id");
			String username = (String) discordUser.get("username");
			String avatar = (String) discordUser.get("avatar");
			String avatarUrl = avatar != null
				? String.format("https://cdn.discordapp.com/avatars/%s/%s.png", discordId, avatar)
				: null;

			// 3. JWT에서 현재 사용자 ID 추출
			String token = payload.get("token");
			if (token == null) {
				return ResponseEntity.badRequest().body(Map.of("success", false, "message", "JWT token missing"));
			}

			Long userId = jwtUtil.getUserIdFromToken(token);
			User user = userService.findById(userId);

			// 4. Discord 정보 연동
			user.setDiscordId(discordId);
			user.setDiscordUsername(username);
			user.setDiscordAvatar(avatarUrl);
			userService.save(user);

			Map<String, Object> data = new HashMap<>();
			data.put("discordId", discordId);
			data.put("discordUsername", username);
			data.put("discordAvatar", avatarUrl);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "Discord 계정이 연동되었습니다.");
			response.put("data", data);

			return ResponseEntity.ok(response);

		} catch (Exception e) {
			System.err.println("Discord OAuth 콜백 처리 중 오류: " + e.getMessage());
			e.printStackTrace();
			return ResponseEntity.status(500).body(Map.of("success", false, "message", "Discord 연동 실패"));
		}
	}

	/**
	 * Discord 계정 연동 해제
	 */
	@DeleteMapping("/unlink")
	public ResponseEntity<?> unlinkDiscord(Authentication authentication) {
		try {
			String token = authentication.getName();
			Long userId = jwtUtil.getUserIdFromToken(token);
			User user = userService.findById(userId);

			user.setDiscordId(null);
			user.setDiscordUsername(null);
			user.setDiscordAvatar(null);
			userService.save(user);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "Discord 연동이 해제되었습니다.");
			return ResponseEntity.ok(response);

		} catch (Exception e) {
			System.err.println("Discord 연동 해제 중 오류: " + e.getMessage());
			return ResponseEntity.status(500).body(Map.of("success", false, "message", "연동 해제 실패"));
		}
	}

	/**
	 * Authorization code를 access token으로 교환
	 */
	private String exchangeCodeForToken(String code) {
		String tokenUrl = "https://discord.com/api/oauth2/token";

		HttpHeaders headers = new HttpHeaders();
		headers.add("Content-Type", "application/x-www-form-urlencoded");

		String body = String.format(
			"client_id=%s&client_secret=%s&grant_type=authorization_code&code=%s&redirect_uri=%s",
			clientId, clientSecret, code, redirectUri
		);

		HttpEntity<String> request = new HttpEntity<>(body, headers);
		ResponseEntity<Map> response = restTemplate.exchange(tokenUrl, HttpMethod.POST, request, Map.class);

		return (String) response.getBody().get("access_token");
	}

	/**
	 * Discord user 정보 조회
	 */
	private Map<String, Object> getDiscordUser(String accessToken) {
		String userUrl = "https://discord.com/api/users/@me";

		HttpHeaders headers = new HttpHeaders();
		headers.add("Authorization", "Bearer " + accessToken);

		HttpEntity<String> request = new HttpEntity<>(headers);
		ResponseEntity<Map> response = restTemplate.exchange(userUrl, HttpMethod.GET, request, Map.class);

		return response.getBody();
	}
}
