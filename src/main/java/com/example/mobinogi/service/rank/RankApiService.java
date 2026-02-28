package com.example.mobinogi.service.rank;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

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
			String url = UriComponentsBuilder.fromHttpUrl(rankApiBase + "/rank/search")
				.queryParam("characterName", characterName)
				.queryParam("serverId", serverId)
				.toUriString();
			
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
}
