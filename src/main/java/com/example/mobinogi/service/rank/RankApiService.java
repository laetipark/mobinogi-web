package com.example.mobinogi.service.rank;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Service
public class RankApiService{

	private final String rankApiBase;
	private final RestTemplate restTemplate;
	private final long failureCooldownMs;
	private final AtomicLong cooldownUntilEpochMs = new AtomicLong(0);
	private final AtomicBoolean requestInFlight = new AtomicBoolean(false);
	private final ObjectMapper objectMapper = new ObjectMapper();

	public RankApiService(
		@Value("${rank.api.base:${RANK_API_BASE:}}") String rankApiBase,
		@Value("${rank.api.connect-timeout-ms:${RANK_API_CONNECT_TIMEOUT_MS:3000}}") int connectTimeoutMs,
		@Value("${rank.api.read-timeout-ms:${RANK_API_READ_TIMEOUT_MS:8000}}") int readTimeoutMs,
		@Value("${rank.api.failure-cooldown-ms:${RANK_API_FAILURE_COOLDOWN_MS:30000}}") long failureCooldownMs
	){
		this.rankApiBase = normalizeBaseUrl(rankApiBase);
		this.failureCooldownMs = Math.max(0, failureCooldownMs);
		SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(Math.max(100, connectTimeoutMs));
		factory.setReadTimeout(Math.max(100, readTimeoutMs));
		this.restTemplate = new RestTemplate(factory);
	}
	
	@Getter
	@Builder
	public static class RankStats{
		private Integer userPower;
		private Integer userVitality;
		private Integer userAttractiveness;
	}

	@Getter
	@Builder
	public static class RankBatchTarget{
		private String characterName;
		private Integer serverId;
	}

	@Getter
	@Builder
	public static class RankBatchStats{
		private Integer requestedCount;
		private Integer acceptedCount;
		private Integer successCount;
		private Integer failedCount;
		private Integer skippedCount;
		private Boolean accepted;
	}

	@Getter
	@Builder
	public static class RankBatchQueueStatus{
		private Boolean processing;
		private Integer queueSize;
		private Boolean refreshing;
		private String refreshStatus;
		private Integer requestedCount;
		private Integer successCount;
		private Integer failedCount;
		private Integer skippedCount;
		private String updatedAt;
	}
	
	public RankStats fetchRankStats(String characterName, Integer serverId){
		if(rankApiBase.isBlank()){
			log.warn("Skipping rank fetch because rank.api.base is blank.");
			return null;
		}
		if(characterName == null || characterName.isBlank() || serverId == null){
			return null;
		}
		long now = System.currentTimeMillis();
		long cooldownUntil = cooldownUntilEpochMs.get();
		if(now < cooldownUntil){
			log.info("Skipping rank API call while cooldown is active. remainingMs={}", cooldownUntil - now);
			return null;
		}
		if(!requestInFlight.compareAndSet(false, true)){
			log.info("Skipping rank API call because another request is already in-flight.");
			return null;
		}

		try{
			long nowInFlight = System.currentTimeMillis();
			long cooldownUntilInFlight = cooldownUntilEpochMs.get();
			if(nowInFlight < cooldownUntilInFlight){
				log.info("Skipping rank API call while cooldown is active. remainingMs={}", cooldownUntilInFlight - nowInFlight);
				return null;
			}
			String encodedCharacterName = UriUtils.encodeQueryParam(characterName, StandardCharsets.UTF_8);
			String url = rankApiBase + "/rank/search"
				+ "?characterName=" + encodedCharacterName
				+ "&serverId=" + serverId;
			
			log.info("Fetching rank from external API: {}", url);
			String response = restTemplate.getForObject(url, String.class);
			cooldownUntilEpochMs.set(0);
			
			if(response == null || response.isEmpty()){
				return null;
			}
			
			JsonNode root = objectMapper.readTree(response);

			// result 객체에서 먼저 찾기
			JsonNode data = null;
			if(root.has("result") && !root.get("result").isNull() && root.get("result").isObject()){
				data = root.get("result");
			}

			// result가 null이면 results 배열에서 characterName 일치하는 항목 찾기
			if(data == null && root.has("results") && root.get("results").isArray()){
				for(JsonNode item : root.get("results")){
					if(item.has("characterName") && characterName.equals(item.get("characterName").asText())){
						data = item;
						break;
					}
				}
			}

			if(data == null){
				log.info("Character not found in search results: {}", characterName);
				return null;
			}
			
			Integer power = extractInt(data, "type_1", "userPower", "user_power", "power");
			Integer vitality = extractInt(data, "type_3", "userVitality", "user_vitality", "vitality");
			Integer attractiveness = extractInt(data, "type_2", "userAttractiveness", "user_attractiveness", "attractiveness");
			
			if(power == null && vitality == null && attractiveness == null){
				return null;
			}
			
			return RankStats.builder()
				.userPower(power)
				.userVitality(vitality)
				.userAttractiveness(attractiveness)
				.build();
		}catch(ResourceAccessException e){
			activateCooldown(now);
			log.warn("Failed to fetch rank from external API (timeout/network): {}", e.getMessage());
			return null;
		}catch(Exception e){
			log.warn("Failed to fetch rank from external API: {}", e.getMessage());
			return null;
		}finally{
			requestInFlight.set(false);
		}
	}

	public RankBatchStats fetchRankStatsBatch(Long guildId, List<RankBatchTarget> targets){
		if(targets == null || targets.isEmpty()){
			return RankBatchStats.builder()
				.requestedCount(0)
				.acceptedCount(0)
				.successCount(0)
				.failedCount(0)
				.skippedCount(0)
				.accepted(false)
				.build();
		}
		if(rankApiBase.isBlank()){
			log.warn("Skipping rank batch fetch because rank.api.base is blank.");
			return RankBatchStats.builder()
				.requestedCount(targets.size())
				.acceptedCount(0)
				.successCount(0)
				.failedCount(targets.size())
				.skippedCount(0)
				.accepted(false)
				.build();
		}

		long now = System.currentTimeMillis();
		long cooldownUntil = cooldownUntilEpochMs.get();
		if(now < cooldownUntil){
			log.info("Skipping rank batch API call while cooldown is active. remainingMs={}", cooldownUntil - now);
			return RankBatchStats.builder()
				.requestedCount(targets.size())
				.acceptedCount(0)
				.successCount(0)
				.failedCount(targets.size())
				.skippedCount(0)
				.accepted(false)
				.build();
		}
		if(!requestInFlight.compareAndSet(false, true)){
			log.info("Skipping rank batch API call because another request is already in-flight.");
			return RankBatchStats.builder()
				.requestedCount(targets.size())
				.acceptedCount(0)
				.successCount(0)
				.failedCount(targets.size())
				.skippedCount(0)
				.accepted(false)
				.build();
		}

		try{
			long nowInFlight = System.currentTimeMillis();
			long cooldownUntilInFlight = cooldownUntilEpochMs.get();
			if(nowInFlight < cooldownUntilInFlight){
				log.info("Skipping rank batch API call while cooldown is active. remainingMs={}", cooldownUntilInFlight - nowInFlight);
				return RankBatchStats.builder()
					.requestedCount(targets.size())
					.acceptedCount(0)
					.successCount(0)
					.failedCount(targets.size())
					.skippedCount(0)
					.accepted(false)
					.build();
			}

			String url = rankApiBase + "/rank/search/batch";
			List<Map<String, Object>> members = targets.stream()
				.map(target -> {
					Map<String, Object> member = new LinkedHashMap<>();
					member.put("characterName", target.getCharacterName());
					member.put("serverId", target.getServerId());
					return member;
				})
				.toList();
			Map<String, Object> requestBody = new LinkedHashMap<>();
			if(guildId != null){
				requestBody.put("guildId", guildId);
			}
			requestBody.put("members", members);

			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_JSON);
			HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);

			log.info("Fetching rank batch from external API. requestedCount={}", targets.size());
			String response = restTemplate.postForObject(url, requestEntity, String.class);
			cooldownUntilEpochMs.set(0);

			if(response == null || response.isBlank()){
				return RankBatchStats.builder()
					.requestedCount(targets.size())
					.acceptedCount(0)
					.successCount(0)
					.failedCount(targets.size())
					.skippedCount(0)
					.accepted(false)
					.build();
			}

			JsonNode root = objectMapper.readTree(response);
			String status = extractText(root, "status", "");
			int requestedCount = extractCount(root, "requestedCount", targets.size());
			int acceptedCount = extractCount(root, "acceptedCount", 0);
			if(acceptedCount <= 0 && "accepted".equalsIgnoreCase(status)){
				acceptedCount = requestedCount;
			}
			int skippedCount = extractCount(root, "skippedCount", 0);

			if("accepted".equalsIgnoreCase(status)){
				return RankBatchStats.builder()
					.requestedCount(requestedCount)
					.acceptedCount(acceptedCount)
					.successCount(0)
					.failedCount(0)
					.skippedCount(skippedCount)
					.accepted(true)
					.build();
			}

			int successCount = extractCount(root, "successCount", acceptedCount > 0 ? acceptedCount : 0);
			int failedCount = root != null && root.has("failedCount")
				? extractCount(root, "failedCount", 0)
				: Math.max(0, requestedCount - successCount);

			return RankBatchStats.builder()
				.requestedCount(requestedCount)
				.acceptedCount(acceptedCount)
				.successCount(successCount)
				.failedCount(failedCount)
				.skippedCount(skippedCount)
				.accepted(false)
				.build();
		}catch(ResourceAccessException e){
			activateCooldown(now);
			log.warn("Failed to fetch rank batch from external API (timeout/network): {}", e.getMessage());
			return RankBatchStats.builder()
				.requestedCount(targets.size())
				.acceptedCount(0)
				.successCount(0)
				.failedCount(targets.size())
				.skippedCount(0)
				.accepted(false)
				.build();
		}catch(Exception e){
			log.warn("Failed to fetch rank batch from external API: {}", e.getMessage());
			return RankBatchStats.builder()
				.requestedCount(targets.size())
				.acceptedCount(0)
				.successCount(0)
				.failedCount(targets.size())
				.skippedCount(0)
				.accepted(false)
				.build();
		}finally{
			requestInFlight.set(false);
		}
	}

	public RankBatchQueueStatus fetchRankBatchQueueStatus(Long guildId){
		if(rankApiBase.isBlank()){
			return null;
		}
		try{
			String url = rankApiBase + "/rank/search/batch/status";
			if(guildId != null){
				url += "?guildId=" + guildId;
			}
			String response = restTemplate.getForObject(url, String.class);
			if(response == null || response.isBlank()){
				return null;
			}
			JsonNode root = objectMapper.readTree(response);
			boolean processing = extractBoolean(root, "processing", false);
			int queueSize = extractCount(root, "queueSize", 0);
			boolean refreshing = extractBoolean(root, "refreshing", false);
			String refreshStatus = extractText(root, "refreshStatus", "IDLE");
			int requestedCount = extractCount(root, "requestedCount", 0);
			int successCount = extractCount(root, "successCount", 0);
			int failedCount = extractCount(root, "failedCount", 0);
			int skippedCount = extractCount(root, "skippedCount", 0);
			String updatedAt = extractText(root, "updatedAt", null);
			return RankBatchQueueStatus.builder()
				.processing(processing)
				.queueSize(queueSize)
				.refreshing(refreshing)
				.refreshStatus(refreshStatus)
				.requestedCount(requestedCount)
				.successCount(successCount)
				.failedCount(failedCount)
				.skippedCount(skippedCount)
				.updatedAt(updatedAt)
				.build();
		}catch(Exception e){
			log.warn("Failed to fetch rank batch queue status: {}", e.getMessage());
			return null;
		}
	}

	private static String normalizeBaseUrl(String base){
		if(base == null){
			return "";
		}
		String trimmed = base.trim();
		while(trimmed.endsWith("/")){
			trimmed = trimmed.substring(0, trimmed.length() - 1);
		}
		return trimmed;
	}

	private void activateCooldown(long now){
		if(failureCooldownMs <= 0){
			return;
		}
		long nextCooldownUntil = now + failureCooldownMs;
		long prev = cooldownUntilEpochMs.getAndUpdate(current -> Math.max(current, nextCooldownUntil));
		if(now >= prev){
			log.warn("Rank API connection issue detected. Enabling cooldown for {} ms.", failureCooldownMs);
		}
	}
	
	private Integer extractInt(JsonNode node, String... fieldNames){
		for(String name : fieldNames){
			if(node.has(name) && !node.get(name).isNull()){
				return node.get(name).asInt();
			}
		}
		return null;
	}

	private int extractCount(JsonNode root, String fieldName, int fallback){
		if(root != null && root.has(fieldName) && !root.get(fieldName).isNull()){
			return root.get(fieldName).asInt(fallback);
		}
		return fallback;
	}

	private boolean extractBoolean(JsonNode root, String fieldName, boolean fallback){
		if(root != null && root.has(fieldName) && !root.get(fieldName).isNull()){
			return root.get(fieldName).asBoolean(fallback);
		}
		return fallback;
	}

	private String extractText(JsonNode root, String fieldName, String fallback){
		if(root != null && root.has(fieldName) && !root.get(fieldName).isNull()){
			String value = root.get(fieldName).asText();
			return value == null ? fallback : value;
		}
		return fallback;
	}
}
