package com.example.mobinogi.controller.rank;

import com.example.mobinogi.dto.rank.UserRankLookupDto;
import com.example.mobinogi.entity.user.UserRank;
import com.example.mobinogi.repository.UserRankRepository;
import com.example.mobinogi.service.rank.RankApiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * User rank lookup controller.
 */
@RestController
@RequestMapping("/api/rank")
@RequiredArgsConstructor
public class UserRankLookupController{

	/** Stale threshold hours for rank refresh. */
	private static final long RANK_STALE_THRESHOLD_HOURS = 24L;

	/** Max retry count while waiting refreshed rows. */
	private static final int RANK_REFRESH_RETRY_COUNT = 4;

	/** Retry delay in milliseconds for refreshed row polling. */
	private static final long RANK_REFRESH_RETRY_DELAY_MS = 1200L;

	/** User-rank repository. */
	private final UserRankRepository userRankRepository;

	/** External rank API service. */
	private final RankApiService rankApiService;

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
				exactRanks = refreshStaleRanksIfNeeded(normalizedNickname, exactRanks);
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

	/**
	 * Refreshes stale ranks and returns latest rows.
	 *
	 * @param nickname normalized nickname
	 * @param currentRanks current rank rows
	 * @return refreshed rank rows
	 */
	private List<UserRank> refreshStaleRanksIfNeeded(String nickname, List<UserRank> currentRanks){
		Set<Integer> staleServerIds = getStaleServerIds(currentRanks);
		if(staleServerIds.isEmpty()){
			return currentRanks;
		}

		boolean refreshTriggered = false;
		for(Integer serverId : staleServerIds){
			if(serverId == null){
				continue;
			}
			RankApiService.RankStats stats = rankApiService.fetchRankStats(nickname, serverId);
			if(stats != null){
				refreshTriggered = true;
			}
		}
		if(!refreshTriggered){
			return currentRanks;
		}

		List<UserRank> latestRanks = currentRanks;
		for(int attempt = 1; attempt <= RANK_REFRESH_RETRY_COUNT; attempt++){
			sleepForRefreshRetryDelay();
			latestRanks = userRankRepository
				.findByUserNameIgnoreCaseAndDeletedAtIsNullOrderByUpdatedAtDescServerIdAsc(nickname);
			if(!hasStaleServerIds(latestRanks, staleServerIds)){
				return latestRanks;
			}
		}

		return latestRanks;
	}

	/**
	 * Returns stale server IDs from current rank rows.
	 *
	 * @param ranks rank rows
	 * @return stale server-id set
	 */
	private Set<Integer> getStaleServerIds(List<UserRank> ranks){
		Map<Integer, UserRank> latestByServer = new LinkedHashMap<>();
		for(UserRank rank : ranks){
			if(rank == null){
				continue;
			}
			Integer serverId = rank.getServerId();
			if(serverId == null){
				continue;
			}
			UserRank existing = latestByServer.get(serverId);
			if(existing == null){
				latestByServer.put(serverId, rank);
				continue;
			}
			LocalDateTime existingUpdatedAt = existing.getUpdatedAt();
			LocalDateTime currentUpdatedAt = rank.getUpdatedAt();
			if(existingUpdatedAt == null || (currentUpdatedAt != null && currentUpdatedAt.isAfter(existingUpdatedAt))){
				latestByServer.put(serverId, rank);
			}
		}

		Set<Integer> staleServerIds = new LinkedHashSet<>();
		for(Map.Entry<Integer, UserRank> entry : latestByServer.entrySet()){
			if(isStaleRank(entry.getValue())){
				staleServerIds.add(entry.getKey());
			}
		}
		return staleServerIds;
	}

	/**
	 * Checks whether any target servers are still stale.
	 *
	 * @param ranks latest rank rows
	 * @param targetServerIds stale target server-id set
	 * @return true when stale rows still exist
	 */
	private boolean hasStaleServerIds(List<UserRank> ranks, Set<Integer> targetServerIds){
		Set<Integer> staleServerIds = getStaleServerIds(ranks);
		for(Integer serverId : targetServerIds){
			if(staleServerIds.contains(serverId)){
				return true;
			}
		}
		return false;
	}

	/**
	 * Returns true when rank row is stale for refresh threshold.
	 *
	 * @param rank rank row
	 * @return stale or not
	 */
	private boolean isStaleRank(UserRank rank){
		if(rank == null || rank.getUpdatedAt() == null){
			return true;
		}
		LocalDateTime now = LocalDateTime.now();
		LocalDateTime updatedAt = rank.getUpdatedAt();
		if(updatedAt.isAfter(now.plusMinutes(1))){
			return false;
		}
		return !updatedAt.isAfter(now.minusHours(RANK_STALE_THRESHOLD_HOURS));
	}

	/**
	 * Sleeps for refresh retry delay.
	 */
	private void sleepForRefreshRetryDelay(){
		try{
			Thread.sleep(RANK_REFRESH_RETRY_DELAY_MS);
		}catch(InterruptedException e){
			Thread.currentThread().interrupt();
		}
	}
}
