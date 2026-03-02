package com.example.mobinogi.controller.rank;

import com.example.mobinogi.dto.rank.UserRankLookupDto;
import com.example.mobinogi.entity.user.UserRank;
import com.example.mobinogi.repository.UserRankRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * User rank lookup controller.
 */
@RestController
@RequestMapping("/api/rank")
@RequiredArgsConstructor
public class UserRankLookupController{

	/** User-rank repository. */
	private final UserRankRepository userRankRepository;

	/**
	 * Finds rank rows by nickname and returns suggestions when not found.
	 *
	 * @param nickname nickname query
	 * @return rank lookup response
	 */
	@GetMapping("/user")
	public ResponseEntity<?> getUserRankByNickname(@RequestParam String nickname){
		try{
			String normalizedNickname = nickname != null ? nickname.trim() : "";
			if(normalizedNickname.isEmpty()){
				throw new RuntimeException("nickname is required.");
			}

			List<UserRank> exactRanks = userRankRepository
				.findByUserNameIgnoreCaseAndDeletedAtIsNullOrderByUpdatedAtDescServerIdAsc(normalizedNickname);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("nickname", normalizedNickname);

			if(!exactRanks.isEmpty()){
				response.put("found", true);
				response.put(
					"ranks",
					exactRanks.stream()
						.map(UserRankLookupDto::fromEntity)
						.collect(Collectors.toList())
				);
				return ResponseEntity.ok(response);
			}

			List<UserRank> similarRanks = userRankRepository
				.findTop5ByUserNameContainingIgnoreCaseAndDeletedAtIsNullOrderByUpdatedAtDesc(normalizedNickname);
			List<String> suggestions = similarRanks.stream()
				.map(UserRank::getUserName)
				.filter(Objects::nonNull)
				.distinct()
				.limit(5)
				.collect(Collectors.toList());

			response.put("found", false);
			response.put("ranks", Collections.emptyList());
			response.put("suggestions", suggestions);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(errorResponse);
		}
	}
}
