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
			throw new RuntimeException("?몄쬆 ?좏겙???꾩슂?⑸땲??");
		}
		String token = authHeader.substring(7);
		if(!jwtUtil.validateToken(token)){
			throw new RuntimeException("?좏슚?섏? ?딆? ?좏겙?낅땲??");
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
			response.put("message", "罹먮┃?곌? ?깅줉?섏뿀?듬땲??");
			response.put("character", character);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage().contains("?좏겙") ? 401 : 400;
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
			response.put("message", "罹먮┃???뺣낫媛 ?섏젙?섏뿀?듬땲??");
			response.put("character", character);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage().contains("?좏겙") ? 401 : 400;
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
				throw new RuntimeException("罹먮┃??ID 紐⑸줉???꾩슂?⑸땲??");
			}
			userCharacterService.reorderCharacters(userId, characterIds);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "罹먮┃???쒖꽌媛 蹂寃쎈릺?덉뒿?덈떎.");

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage().contains("?좏겙") ? 401 : 400;
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
			response.put("message", "罹먮┃?곌? ??젣?섏뿀?듬땲??");

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage().contains("?좏겙") ? 401 : 400;
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

			// 罹먯떆 ?뺤씤: updatedAt??10遺??대궡硫?罹먯떆 ?곗씠??諛섑솚
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

			// ?몃? API?먯꽌 理쒖떊 ?곗씠??議고쉶
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
				// ?몃? API ?ㅽ뙣 ??湲곗〈 罹먯떆 ?곗씠??諛섑솚
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

			int status = e.getMessage().contains("?좏겙") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

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
