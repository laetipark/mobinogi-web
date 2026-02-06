package com.example.mobinogi.controller.user;

import com.example.mobinogi.dto.user.UserCharacterDto;
import com.example.mobinogi.dto.user.UserCharacterRequest;
import com.example.mobinogi.service.user.UserCharacterService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user/characters")
@RequiredArgsConstructor
public class UserCharacterController{

	private final UserCharacterService userCharacterService;
	private final JwtUtil jwtUtil;

	private Long getUserIdFromToken(String authHeader){
		if(authHeader == null || !authHeader.startsWith("Bearer ")){
			throw new RuntimeException("인증 토큰이 필요합니다.");
		}
		String token = authHeader.substring(7);
		if(!jwtUtil.validateToken(token)){
			throw new RuntimeException("유효하지 않은 토큰입니다.");
		}
		return jwtUtil.getUserIdFromToken(token);
	}

	@GetMapping
	public ResponseEntity<?> getMyCharacters(@RequestHeader(value = "Authorization", required = false) String authHeader){
		try{
			Long userId = getUserIdFromToken(authHeader);
			List<UserCharacterDto> characters = userCharacterService.getCharactersByUserId(userId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("characters", characters);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			return ResponseEntity.status(401).body(errorResponse);
		}
	}

	@PostMapping
	public ResponseEntity<?> createCharacter(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody UserCharacterRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserCharacterDto character = userCharacterService.createCharacter(userId, request);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "캐릭터가 등록되었습니다.");
			response.put("character", character);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	@PutMapping("/{characterId}")
	public ResponseEntity<?> updateCharacter(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long characterId,
		@RequestBody UserCharacterRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserCharacterDto character = userCharacterService.updateCharacter(userId, characterId, request);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "캐릭터 정보가 수정되었습니다.");
			response.put("character", character);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	@DeleteMapping("/{characterId}")
	public ResponseEntity<?> deleteCharacter(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long characterId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			userCharacterService.deleteCharacter(userId, characterId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "캐릭터가 삭제되었습니다.");

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}
}
