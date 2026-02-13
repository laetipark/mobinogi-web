package com.example.mobinogi.controller.user;

import com.example.mobinogi.dto.user.UserCharacterDto;
import com.example.mobinogi.dto.user.UserCharacterRequest;
import com.example.mobinogi.entity.UserRank;
import com.example.mobinogi.repository.UserRankRepository;
import com.example.mobinogi.service.rank.RankApiService;
import com.example.mobinogi.service.user.UserCharacterService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user/characters")
@RequiredArgsConstructor
public class UserCharacterController{

	private final UserCharacterService userCharacterService;
	private final RankApiService rankApiService;
	private final UserRankRepository userRankRepository;
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

	@PutMapping("/reorder")
	public ResponseEntity<?> reorderCharacters(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody Map<String, List<Long>> request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			List<Long> characterIds = request.get("characterIds");
			if(characterIds == null || characterIds.isEmpty()){
				throw new RuntimeException("캐릭터 ID 목록이 필요합니다.");
			}
			userCharacterService.reorderCharacters(userId, characterIds);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "캐릭터 순서가 변경되었습니다.");

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

	@GetMapping("/rank")
	public ResponseEntity<?> fetchRank(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestParam String characterName,
		@RequestParam Integer serverId
	){
		try{
			getUserIdFromToken(authHeader);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);

			// 캐시 확인: updatedAt이 10분 이내면 캐시 데이터 반환
			var rankOpt = userRankRepository.findByServerIdAndUserNameAndDeletedAtIsNull(serverId, characterName);
			if(rankOpt.isPresent()){
				var rank = rankOpt.get();
				if(rank.getUpdatedAt() != null && rank.getUpdatedAt().isAfter(LocalDateTime.now().minusMinutes(10))){
					response.put("userPower", rank.getUserPower());
					response.put("userVitality", rank.getUserVitality());
					response.put("userAttractiveness", rank.getUserAttractiveness());
					response.put("cached", true);
					return ResponseEntity.ok(response);
				}
			}

			// 외부 API에서 최신 데이터 조회
			var stats = rankApiService.fetchRankStats(characterName, serverId);

			if(stats != null){
				response.put("userPower", stats.getUserPower());
				response.put("userVitality", stats.getUserVitality());
				response.put("userAttractiveness", stats.getUserAttractiveness());

				// DB 갱신
				UserRank rank = rankOpt.orElseGet(() -> {
					UserRank newRank = new UserRank();
					newRank.setServerId(serverId);
					newRank.setUserName(characterName);
					newRank.setClassId(0);
					return newRank;
				});
				rank.setUserPower(stats.getUserPower());
				rank.setUserVitality(stats.getUserVitality());
				rank.setUserAttractiveness(stats.getUserAttractiveness());
				userRankRepository.save(rank);
			}else if(rankOpt.isPresent()){
				// 외부 API 실패 시 기존 캐시 데이터 반환
				var rank = rankOpt.get();
				response.put("userPower", rank.getUserPower());
				response.put("userVitality", rank.getUserVitality());
				response.put("userAttractiveness", rank.getUserAttractiveness());
				response.put("cached", true);
			}else{
				response.put("userPower", null);
				response.put("userVitality", null);
				response.put("userAttractiveness", null);
			}

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
