package com.example.mobinogi.service.board;

import com.example.mobinogi.dto.board.BoardPostDto;
import com.example.mobinogi.entity.User;
import com.example.mobinogi.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class BoardExternalService{

	private final RedisTemplate<String, Object> redisTemplate;
	private final UserRepository userRepository;
	private final ObjectMapper objectMapper;

	@Value("${discord.bot.token:}")
	private String discordBotToken;

	private final RestTemplate restTemplate = new RestTemplate();

	// Discord username 캐시 (user ID -> username)
	private final Map<String, String> discordUsernameCache = new ConcurrentHashMap<>();

	/**
	 * Notion 게시물 조회
	 */
	public List<BoardPostDto> getNotionPosts(){
		try{
			List<Object> rawPosts = redisTemplate.opsForList().range("board:notion:posts", 0, -1);
			if(rawPosts == null || rawPosts.isEmpty()){
				return new ArrayList<>();
			}

			List<BoardPostDto> posts = new ArrayList<>();
			for(Object raw : rawPosts){
				Map<String, Object> map = objectMapper.convertValue(raw, new TypeReference<Map<String, Object>>(){
				});
				BoardPostDto dto = convertToBoardPostDto(map, "NOTION");
				posts.add(dto);
			}

			return posts;
		}catch(Exception e){
			log.error("Notion 게시물 조회 실패: {}", e.getMessage());
			return new ArrayList<>();
		}
	}

	/**
	 * Discord 게시물 조회
	 */
	public List<BoardPostDto> getDiscordPosts(){
		try{
			List<Object> rawPosts = redisTemplate.opsForList().range("board:discord:posts", 0, -1);
			if(rawPosts == null || rawPosts.isEmpty()){
				return new ArrayList<>();
			}

			List<BoardPostDto> posts = new ArrayList<>();
			for(Object raw : rawPosts){
				Map<String, Object> map = objectMapper.convertValue(raw, new TypeReference<Map<String, Object>>(){
				});
				BoardPostDto dto = convertToBoardPostDto(map, "DISCORD");
				posts.add(dto);
			}

			return posts;
		}catch(Exception e){
			log.error("Discord 게시물 조회 실패: {}", e.getMessage());
			return new ArrayList<>();
		}
	}

	/**
	 * Map을 BoardPostDto로 변환
	 * Discord 게시물의 경우 externalAuthor(Discord user ID)와 User.discordId 매칭
	 */
	private BoardPostDto convertToBoardPostDto(Map<String, Object> map, String sourceType){
		BoardPostDto dto = new BoardPostDto();
		dto.setExternalId((String) map.get("externalId"));
		dto.setSource((String) map.get("source"));
		dto.setTitle((String) map.get("title"));
		dto.setContent((String) map.get("content"));
		dto.setUrl((String) map.get("url"));
		dto.setExternalUrl((String) map.get("url"));
		dto.setSourceType(sourceType);

		@SuppressWarnings("unchecked")
		List<String> tags = (List<String>) map.get("tags");
		dto.setTags(tags);

		@SuppressWarnings("unchecked")
		List<String> images = (List<String>) map.get("images");
		dto.setImages(images);

		String createdAtStr = (String) map.get("createdAt");
		dto.setCreatedAtString(createdAtStr);
		if(createdAtStr != null){
			try{
				dto.setCreatedAt(LocalDateTime.ofInstant(Instant.parse(createdAtStr), ZoneId.of("Asia/Seoul")));
			}catch(Exception ignored){}
		}

		String externalAuthor = (String) map.get("externalAuthor");

		// Discord 게시물인 경우 User.discordId와 매칭 시도
		if("DISCORD".equals(sourceType) && externalAuthor != null){
			Optional<User> linkedUser = userRepository.findByDiscordIdAndDeletedAtIsNull(externalAuthor);
			if(linkedUser.isPresent()){
				User user = linkedUser.get();
				dto.setAuthorNickname(user.getNickname());
				dto.setAuthorProfileImage(user.getProfileImage());
				dto.setAuthorDiscordId(user.getDiscordId());
			}else{
				// DB에 매칭 안 되면 Discord API로 username 조회
				String username = resolveDiscordUsername(externalAuthor);
				dto.setAuthorNickname(username);
			}
		}else{
			dto.setAuthorNickname(externalAuthor);
		}

		dto.setExternalAuthor(externalAuthor);
		dto.setViewCount(0);
		dto.setCommentCount(0L);

		return dto;
	}

	/**
	 * Discord API로 user ID → username 조회 (메모리 캐시)
	 */
	private String resolveDiscordUsername(String discordUserId){
		if(discordUserId == null || discordUserId.isEmpty()){
			return "Discord 사용자";
		}

		// 캐시 확인
		String cached = discordUsernameCache.get(discordUserId);
		if(cached != null){
			return cached;
		}

		// Bot Token 없으면 fallback
		if(discordBotToken == null || discordBotToken.isEmpty()){
			return "Discord 사용자";
		}

		try{
			HttpHeaders headers = new HttpHeaders();
			headers.add("Authorization", "Bot " + discordBotToken);

			HttpEntity<String> request = new HttpEntity<>(headers);
			ResponseEntity<Map> response = restTemplate.exchange(
				"https://discord.com/api/v10/users/" + discordUserId,
				HttpMethod.GET,
				request,
				Map.class
			);

			Map<String, Object> body = response.getBody();
			if(body != null){
				String globalName = (String) body.get("global_name");
				String username = (String) body.get("username");
				String displayName = globalName != null ? globalName : username;

				if(displayName != null){
					discordUsernameCache.put(discordUserId, displayName);
					return displayName;
				}
			}
		}catch(Exception e){
			log.warn("Discord 사용자 조회 실패 (ID: {}): {}", discordUserId, e.getMessage());
		}

		// API 실패 시 fallback 캐시
		discordUsernameCache.put(discordUserId, "Discord 사용자");
		return "Discord 사용자";
	}
}
