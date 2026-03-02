package com.example.mobinogi.controller.user;

import com.example.mobinogi.dto.user.UserCharacterDto;
import com.example.mobinogi.dto.user.UserCharacterRequest;
import com.example.mobinogi.entity.user.UserRank;
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

	/** 사용자 캐릭터 비즈니스 로직 서비스 */
	private final UserCharacterService userCharacterService;

	/** 외부 랭크 API 연동 서비스 */
	private final RankApiService rankApiService;

	/** 랭크 캐시 조회 리포지토리 */
	private final UserRankRepository userRankRepository;

	/** 인증 토큰 검증 유틸 */
	private final JwtUtil jwtUtil;

	/**
	 * Authorization 헤더에서 사용자 ID를 추출합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @return 토큰에서 추출한 사용자 ID
	 */
	private Long getUserIdFromToken(String authHeader){
		if(authHeader == null || !authHeader.startsWith("Bearer ")){
			throw new RuntimeException("인증 토큰이 필요합니다.");
		}
		String token = authHeader.substring(7);
		if(!jwtUtil.validateToken(token)){
			throw new RuntimeException("유효하지 않은 또는 만료된 토큰입니다.");
		}
		return jwtUtil.getUserIdFromToken(token);
	}

	/**
	 * 로그인 사용자의 캐릭터 목록을 조회합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @return 캐릭터 목록 응답
	 */
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

	/**
	 * 캐릭터를 생성합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @param request 생성 요청 본문
	 * @return 생성 결과 응답
	 */
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
			response.put("message", "캐릭터가 생성되었습니다.");
			response.put("character", character);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	/**
	 * 캐릭터 정보를 수정합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @param characterId 대상 캐릭터 ID
	 * @param request 수정 요청 본문
	 * @return 수정 결과 응답
	 */
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

			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	/**
	 * 캐릭터 표시 순서를 재정렬합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @param request 순서 정보 본문
	 * @return 재정렬 결과 응답
	 */
	@PutMapping("/reorder")
	public ResponseEntity<?> reorderCharacters(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody Map<String, List<Long>> request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			List<Long> characterIds = request.get("characterIds");
			if(characterIds == null || characterIds.isEmpty()){
				throw new RuntimeException("캐릭터 ID 목록은 비어 있을 수 없습니다.");
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

			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	/**
	 * 캐릭터를 삭제합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @param characterId 대상 캐릭터 ID
	 * @return 삭제 결과 응답
	 */
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

			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	/**
	 * 캐릭터 랭크 데이터를 조회합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @param characterName 캐릭터명
	 * @param serverId 서버 ID
	 * @return 랭크 데이터 응답
	 */
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

			// 캐시 확인: updatedAt이 10분 이내면 캐시 데이터를 반환
			var rankOpt = userRankRepository.findLatestActiveByServerIdAndUserName(serverId, characterName);
			if(rankOpt.isPresent()){
				var rank = rankOpt.get();
				if(isFreshRankCache(rank)){
					response.put("userPower", rank.getUserPower());
					response.put("userVitality", rank.getUserVitality());
					response.put("userAttractiveness", rank.getUserAttractiveness());
					response.put("cached", true);
					response.put("updatedAt", rank.getUpdatedAt());
					return ResponseEntity.ok(response);
				}
			}

			// 랭크 API에서 최신 데이터를 조회
			var stats = rankApiService.fetchRankStats(characterName, serverId);

			if(stats != null){
				// user_rank writes are owned by crawler; backend only reads latest row.
				UserRank refreshedRank = userRankRepository.findLatestActiveByServerIdAndUserName(serverId, characterName).orElse(null);
				if(refreshedRank != null){
					response.put("userPower", refreshedRank.getUserPower());
					response.put("userVitality", refreshedRank.getUserVitality());
					response.put("userAttractiveness", refreshedRank.getUserAttractiveness());
					response.put("updatedAt", refreshedRank.getUpdatedAt());
				}else{
					response.put("userPower", stats.getUserPower());
					response.put("userVitality", stats.getUserVitality());
					response.put("userAttractiveness", stats.getUserAttractiveness());
					response.put("updatedAt", null);
				}
				response.put("cached", false);

			}else if(rankOpt.isPresent()){
				// 랭크 API 실패 시 기존 캐시 데이터를 반환
				var rank = rankOpt.get();
				response.put("userPower", rank.getUserPower());
				response.put("userVitality", rank.getUserVitality());
				response.put("userAttractiveness", rank.getUserAttractiveness());
				response.put("cached", true);
				response.put("updatedAt", rank.getUpdatedAt());
			}else{
				response.put("userPower", null);
				response.put("userVitality", null);
				response.put("userAttractiveness", null);
				response.put("cached", false);
				response.put("updatedAt", null);
			}

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	/**
	 * 캐시된 랭크 정보가 재사용 가능한 최신 데이터인지 판별합니다.
	 *
	 * @param rank 랭크 엔티티
	 * @return 최신 캐시 여부
	 */
	private boolean isFreshRankCache(UserRank rank){
		if(rank.getUpdatedAt() == null){
			return false;
		}
		LocalDateTime now = LocalDateTime.now();
		LocalDateTime updatedAt = rank.getUpdatedAt();
		if(updatedAt.isAfter(now.plusMinutes(1))){
			return false;
		}
		return !updatedAt.isBefore(now.minusMinutes(10));
	}
}
