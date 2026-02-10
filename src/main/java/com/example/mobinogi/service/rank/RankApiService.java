package com.example.mobinogi.service.rank;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Service
public class RankApiService{
	
	@Value("${RANK_API_BASE:}")
	private String rankApiBase;
	
	private final RestTemplate restTemplate = new RestTemplate();
	private final ObjectMapper objectMapper = new ObjectMapper();
	
	@Getter
	@Builder
	public static class RankStats{
		private Integer userPower;
		private Integer userVitality;
		private Integer userAttractiveness;
	}
	
	public RankStats fetchRankStats(String characterName, Integer serverId){
		try{
			String url = UriComponentsBuilder.fromHttpUrl(rankApiBase + "/rank/search")
				.queryParam("characterName", characterName)
				.queryParam("serverId", serverId)
				.toUriString();
			
			log.info("Fetching rank from external API: {}", url);
			String response = restTemplate.getForObject(url, String.class);
			
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
			log.info(String.valueOf(power));
			log.info(String.valueOf(vitality));
			log.info(String.valueOf(attractiveness));
			
			if(power == null && vitality == null && attractiveness == null){
				return null;
			}
			
			return RankStats.builder()
				.userPower(power)
				.userVitality(vitality)
				.userAttractiveness(attractiveness)
				.build();
		}catch(Exception e){
			log.warn("Failed to fetch rank from external API: {}", e.getMessage());
			return null;
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