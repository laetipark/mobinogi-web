package com.example.mobinogi.service.discord;

import com.example.mobinogi.dto.board.BoardPostDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class DiscordSyncService{

	@Value("${discord.bot.token:}")
	private String botToken;

	@Value("${discord.text.channel.ids:}")
	private String textChannelIds;

	@Value("${discord.forum.channel.ids:}")
	private String forumChannelIds;

	private final ObjectMapper objectMapper;

	private static final String DISCORD_API = "https://discord.com/api/v10";

	private final List<BoardPostDto> cachedPosts = new CopyOnWriteArrayList<>();

	public List<BoardPostDto> getCachedPosts(){
		return Collections.unmodifiableList(cachedPosts);
	}

	public void syncDiscordChannels(){
		if(botToken == null || botToken.isEmpty()){
			log.debug("Discord Bot 토큰이 설정되지 않아 동기화를 건너뜁니다.");
			return;
		}

		List<BoardPostDto> newPosts = new ArrayList<>();
		int totalSynced = 0;

		try{
			// 텍스트 채널 동기화
			if(textChannelIds != null && !textChannelIds.isEmpty()){
				for(String channelId : textChannelIds.split(",")){
					channelId = channelId.trim();
					if(!channelId.isEmpty()){
						List<BoardPostDto> posts = syncTextChannel(channelId);
						newPosts.addAll(posts);
						totalSynced += posts.size();
					}
				}
			}

			// 포럼 채널 동기화
			if(forumChannelIds != null && !forumChannelIds.isEmpty()){
				for(String channelId : forumChannelIds.split(",")){
					channelId = channelId.trim();
					if(!channelId.isEmpty()){
						List<BoardPostDto> posts = syncForumChannel(channelId);
						newPosts.addAll(posts);
						totalSynced += posts.size();
					}
				}
			}

			// 날짜 내림차순 정렬 후 캐시 교체
			newPosts.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
			cachedPosts.clear();
			cachedPosts.addAll(newPosts);

			log.info("Discord 동기화 완료: {}개 메시지 캐시 저장", totalSynced);
		}catch(Exception e){
			log.error("Discord 동기화 실패: {}", e.getMessage());
		}
	}

	private List<BoardPostDto> syncTextChannel(String channelId) throws Exception{
		log.info("텍스트 채널 동기화 시작: {}", channelId);
		List<BoardPostDto> posts = new ArrayList<>();

		JsonNode messages = fetchMessages(channelId, 50);
		if(messages == null || !messages.isArray()) return posts;

		for(JsonNode msg : messages){
			try{
				String messageId = msg.get("id").asText();
				String textContent = msg.has("content") ? msg.get("content").asText() : "";
				List<String> imageUrls = extractImageUrls(msg);

				// 텍스트도 없고 이미지도 없으면 건너뛰기
				if(textContent.isEmpty() && imageUrls.isEmpty()) continue;

				String content = buildContentWithImages(textContent, imageUrls);

				String authorName = "Discord 사용자";
				if(msg.has("author") && msg.get("author").has("username")){
					authorName = msg.get("author").get("username").asText();
					if(msg.get("author").has("global_name") && !msg.get("author").get("global_name").isNull()){
						authorName = msg.get("author").get("global_name").asText();
					}
				}

				// 제목: 텍스트의 첫 줄 또는 100자까지
				String title = textContent.isEmpty() ? authorName + "의 이미지" : textContent.split("\n")[0];
				if(title.length() > 100) title = title.substring(0, 100) + "...";

				LocalDateTime createdAt = LocalDateTime.now();
				if(msg.has("timestamp")){
					try{
						createdAt = OffsetDateTime.parse(msg.get("timestamp").asText()).toLocalDateTime();
					}catch(Exception ignored){}
				}

				BoardPostDto dto = BoardPostDto.builder()
					.postId(null)
					.title(title)
					.content(content)
					.sourceType("DISCORD")
					.externalUrl("https://discord.com/channels/" + channelId + "/" + messageId)
					.externalAuthor(authorName)
					.authorNickname(authorName)
					.viewCount(0)
					.commentCount(0L)
					.createdAt(createdAt)
					.build();

				posts.add(dto);
			}catch(Exception e){
				String messageId = msg.has("id") ? msg.get("id").asText() : "unknown";
				log.warn("텍스트 메시지 동기화 실패 ({}): {}", messageId, e.getMessage());
			}
		}

		return posts;
	}

	private List<BoardPostDto> syncForumChannel(String channelId) throws Exception{
		log.info("포럼 채널 동기화 시작: {}", channelId);
		List<BoardPostDto> posts = new ArrayList<>();

		// 포럼 채널 정보에서 available_tags 가져오기
		Map<String, String> tagIdToName = fetchForumTags(channelId);

		// 포럼 채널의 활성 스레드 목록 가져오기
		JsonNode threads = fetchActiveThreads(channelId);
		if(threads == null || !threads.isArray()) return posts;

		for(JsonNode thread : threads){
			try{
				String threadId = thread.get("id").asText();
				String threadName = thread.has("name") ? thread.get("name").asText() : "제목 없음";

				// 스레드의 applied_tags → 카테고리명 매핑
				String categoryName = resolveForumTagName(thread, tagIdToName);

				// 포럼 스레드의 전체 메시지 가져오기
				JsonNode allMessages = fetchAllThreadMessages(threadId);
				String authorName = "Discord 사용자";
				StringBuilder contentBuilder = new StringBuilder();

				if(allMessages != null && allMessages.isArray() && !allMessages.isEmpty()){
					// 첫 번째 메시지에서 작성자 정보 가져오기
					JsonNode firstMsg = allMessages.get(0);
					if(firstMsg.has("author")){
						JsonNode author = firstMsg.get("author");
						if(author.has("global_name") && !author.get("global_name").isNull()){
							authorName = author.get("global_name").asText();
						}else if(author.has("username")){
							authorName = author.get("username").asText();
						}
					}

					// 모든 메시지를 순서대로 합치기
					for(int i = 0; i < allMessages.size(); i++){
						JsonNode msg = allMessages.get(i);
						String msgText = msg.has("content") ? msg.get("content").asText() : "";
						List<String> msgImages = extractImageUrls(msg);

						String msgContent = buildContentWithImages(msgText, msgImages);
						if(!msgContent.isEmpty()){
							if(contentBuilder.length() > 0){
								// 메시지 구분선 (작성자가 다르면 표시)
								String msgAuthor = extractAuthorName(msg);
								contentBuilder.append("\n\n---\n\n");
								if(!msgAuthor.equals(authorName)){
									contentBuilder.append("**").append(msgAuthor).append(":**\n\n");
								}
							}
							contentBuilder.append(msgContent);
						}
					}
				}

				String content = contentBuilder.length() > 0 ? contentBuilder.toString() : threadName;

				LocalDateTime createdAt = LocalDateTime.now();
				if(thread.has("thread_metadata") && thread.get("thread_metadata").has("create_timestamp")){
					try{
						String ts = thread.get("thread_metadata").get("create_timestamp").asText();
						createdAt = OffsetDateTime.parse(ts).toLocalDateTime();
					}catch(Exception ignored){}
				}

				String guildId = thread.has("guild_id") ? thread.get("guild_id").asText() : "";

				BoardPostDto dto = BoardPostDto.builder()
					.postId(null)
					.title(threadName)
					.content(content)
					.sourceType("DISCORD")
					.externalUrl("https://discord.com/channels/" + guildId + "/" + threadId)
					.externalAuthor(authorName)
					.authorNickname(authorName)
					.categoryName(categoryName)
					.viewCount(0)
					.commentCount(0L)
					.createdAt(createdAt)
					.build();

				posts.add(dto);
				log.info("포럼 스레드 동기화 성공: {} ({}) - 메시지 {}개", threadName, threadId,
					allMessages != null ? allMessages.size() : 0);
			}catch(Exception e){
				String threadId = thread.has("id") ? thread.get("id").asText() : "unknown";
				log.warn("포럼 스레드 동기화 실패 ({}): {}", threadId, e.getMessage());
			}
		}

		return posts;
	}

	/**
	 * 메시지에서 작성자명 추출
	 */
	private String extractAuthorName(JsonNode msg){
		if(msg.has("author")){
			JsonNode author = msg.get("author");
			if(author.has("global_name") && !author.get("global_name").isNull()){
				return author.get("global_name").asText();
			}
			if(author.has("username")){
				return author.get("username").asText();
			}
		}
		return "Discord 사용자";
	}

	/**
	 * 포럼 채널의 available_tags 가져오기 (tag id → tag name 맵)
	 */
	private Map<String, String> fetchForumTags(String channelId) throws Exception{
		Map<String, String> tagMap = new HashMap<>();

		HttpClient httpClient = HttpClient.newHttpClient();
		HttpRequest request = HttpRequest.newBuilder()
			.uri(URI.create(DISCORD_API + "/channels/" + channelId))
			.header("Authorization", "Bot " + botToken)
			.header("Content-Type", "application/json")
			.GET()
			.build();

		HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
		if(response.statusCode() != 200){
			log.warn("포럼 채널 정보 조회 실패: status={}", response.statusCode());
			return tagMap;
		}

		JsonNode channelData = objectMapper.readTree(response.body());
		JsonNode availableTags = channelData.get("available_tags");
		if(availableTags != null && availableTags.isArray()){
			for(JsonNode tag : availableTags){
				String tagId = tag.has("id") ? tag.get("id").asText() : "";
				String tagName = tag.has("name") ? tag.get("name").asText() : "";
				if(!tagId.isEmpty() && !tagName.isEmpty()){
					tagMap.put(tagId, tagName);
				}
			}
		}

		return tagMap;
	}

	/**
	 * 스레드의 applied_tags에서 첫 번째 태그명을 반환
	 */
	private String resolveForumTagName(JsonNode thread, Map<String, String> tagIdToName){
		JsonNode appliedTags = thread.get("applied_tags");
		if(appliedTags == null || !appliedTags.isArray() || appliedTags.isEmpty())
			return null;

		String firstTagId = appliedTags.get(0).asText();
		return tagIdToName.get(firstTagId);
	}

	/**
	 * 포럼 채널 연결 상태 및 내용 확인용 디버그 메서드
	 */
	public Map<String, Object> debugForumChannel(String channelId){
		Map<String, Object> result = new HashMap<>();
		try{
			HttpClient httpClient = HttpClient.newHttpClient();
			HttpRequest channelRequest = HttpRequest.newBuilder()
				.uri(URI.create(DISCORD_API + "/channels/" + channelId))
				.header("Authorization", "Bot " + botToken)
				.header("Content-Type", "application/json")
				.GET()
				.build();

			HttpResponse<String> channelResponse = httpClient.send(channelRequest, HttpResponse.BodyHandlers.ofString());
			result.put("channelStatus", channelResponse.statusCode());
			result.put("channelBody", objectMapper.readTree(channelResponse.body()));

			if(channelResponse.statusCode() != 200){
				result.put("error", "채널 조회 실패: " + channelResponse.statusCode());
				return result;
			}

			Map<String, String> tags = fetchForumTags(channelId);
			result.put("availableTags", tags);

			JsonNode threads = fetchActiveThreads(channelId);
			result.put("threads", threads);
			result.put("threadCount", threads != null && threads.isArray() ? threads.size() : 0);

		}catch(Exception e){
			result.put("error", e.getMessage());
		}
		return result;
	}

	/**
	 * 메시지의 attachments와 embeds에서 이미지 URL 추출
	 */
	private List<String> extractImageUrls(JsonNode msg){
		List<String> urls = new ArrayList<>();

		// attachments (파일 첨부)
		JsonNode attachments = msg.get("attachments");
		if(attachments != null && attachments.isArray()){
			for(JsonNode att : attachments){
				String contentType = att.has("content_type") ? att.get("content_type").asText() : "";
				String url = att.has("url") ? att.get("url").asText() : "";
				if(!url.isEmpty() && (contentType.startsWith("image/") || url.matches(".*\\.(png|jpg|jpeg|gif|webp)(\\?.*)?$"))){
					urls.add(url);
				}
			}
		}

		// embeds (임베드 이미지)
		JsonNode embeds = msg.get("embeds");
		if(embeds != null && embeds.isArray()){
			for(JsonNode embed : embeds){
				if(embed.has("image") && embed.get("image").has("url")){
					urls.add(embed.get("image").get("url").asText());
				}
				if(embed.has("thumbnail") && embed.get("thumbnail").has("url")){
					String thumbUrl = embed.get("thumbnail").get("url").asText();
					if(!urls.contains(thumbUrl)){
						urls.add(thumbUrl);
					}
				}
			}
		}

		return urls;
	}

	/**
	 * 텍스트 content + 이미지 URL을 마크다운으로 결합
	 */
	private String buildContentWithImages(String text, List<String> imageUrls){
		StringBuilder sb = new StringBuilder();
		if(text != null && !text.isEmpty()){
			sb.append(text);
		}
		if(imageUrls != null && !imageUrls.isEmpty()){
			if(sb.length() > 0) sb.append("\n\n");
			for(String url : imageUrls){
				sb.append("![image](").append(url).append(")\n");
			}
		}
		return sb.toString().trim();
	}

	/**
	 * 스레드의 전체 메시지 가져오기 (오래된 순서대로 정렬)
	 */
	private JsonNode fetchAllThreadMessages(String threadId) throws Exception{
		HttpClient httpClient = HttpClient.newHttpClient();
		List<JsonNode> allMessages = new ArrayList<>();
		String afterId = "0";

		while(true){
			HttpRequest request = HttpRequest.newBuilder()
				.uri(URI.create(DISCORD_API + "/channels/" + threadId + "/messages?limit=100&after=" + afterId))
				.header("Authorization", "Bot " + botToken)
				.header("Content-Type", "application/json")
				.GET()
				.build();

			HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

			if(response.statusCode() != 200){
				log.warn("Discord 스레드 메시지 조회 실패 (thread={}): status={}", threadId, response.statusCode());
				break;
			}

			JsonNode messages = objectMapper.readTree(response.body());
			if(!messages.isArray() || messages.isEmpty()) break;

			for(JsonNode msg : messages){
				allMessages.add(msg);
			}

			// 100개 미만이면 더 이상 없음
			if(messages.size() < 100) break;

			// 다음 페이지 (after 파라미터는 오름차순 반환이므로 마지막 ID 사용)
			afterId = messages.get(messages.size() - 1).get("id").asText();
		}

		// after 파라미터는 ID 오름차순으로 반환하므로 이미 시간순 정렬
		return objectMapper.valueToTree(allMessages);
	}

	private JsonNode fetchMessage(String channelId, String messageId) throws Exception{
		HttpClient httpClient = HttpClient.newHttpClient();
		HttpRequest request = HttpRequest.newBuilder()
			.uri(URI.create(DISCORD_API + "/channels/" + channelId + "/messages/" + messageId))
			.header("Authorization", "Bot " + botToken)
			.header("Content-Type", "application/json")
			.GET()
			.build();

		HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

		if(response.statusCode() != 200){
			log.warn("Discord 메시지 조회 실패 (channel={}, message={}): status={}", channelId, messageId, response.statusCode());
			return null;
		}

		return objectMapper.readTree(response.body());
	}

	private JsonNode fetchMessages(String channelId, int limit) throws Exception{
		HttpClient httpClient = HttpClient.newHttpClient();
		HttpRequest request = HttpRequest.newBuilder()
			.uri(URI.create(DISCORD_API + "/channels/" + channelId + "/messages?limit=" + limit))
			.header("Authorization", "Bot " + botToken)
			.header("Content-Type", "application/json")
			.GET()
			.build();

		HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

		if(response.statusCode() != 200){
			log.error("Discord API 오류 (messages): status={}, body={}", response.statusCode(), response.body());
			return null;
		}

		return objectMapper.readTree(response.body());
	}

	private JsonNode fetchActiveThreads(String channelId) throws Exception{
		HttpClient httpClient = HttpClient.newHttpClient();
		List<JsonNode> allThreads = new ArrayList<>();

		HttpRequest channelRequest = HttpRequest.newBuilder()
			.uri(URI.create(DISCORD_API + "/channels/" + channelId))
			.header("Authorization", "Bot " + botToken)
			.header("Content-Type", "application/json")
			.GET()
			.build();

		HttpResponse<String> channelResponse = httpClient.send(channelRequest, HttpResponse.BodyHandlers.ofString());
		if(channelResponse.statusCode() != 200){
			log.error("Discord API 오류 (channel): status={}", channelResponse.statusCode());
			return null;
		}

		JsonNode channelData = objectMapper.readTree(channelResponse.body());
		String guildId = channelData.has("guild_id") ? channelData.get("guild_id").asText() : "";

		HttpRequest threadsRequest = HttpRequest.newBuilder()
			.uri(URI.create(DISCORD_API + "/guilds/" + guildId + "/threads/active"))
			.header("Authorization", "Bot " + botToken)
			.header("Content-Type", "application/json")
			.GET()
			.build();

		HttpResponse<String> threadsResponse = httpClient.send(threadsRequest, HttpResponse.BodyHandlers.ofString());
		if(threadsResponse.statusCode() == 200){
			JsonNode threadsData = objectMapper.readTree(threadsResponse.body());
			if(threadsData.has("threads")){
				for(JsonNode thread : threadsData.get("threads")){
					if(thread.has("parent_id") && channelId.equals(thread.get("parent_id").asText())){
						allThreads.add(thread);
					}
				}
			}
		}

		boolean hasMore = true;
		String before = null;
		while(hasMore){
			String archivedUrl = DISCORD_API + "/channels/" + channelId + "/threads/archived/public?limit=100";
			if(before != null){
				archivedUrl += "&before=" + before;
			}

			HttpRequest archivedRequest = HttpRequest.newBuilder()
				.uri(URI.create(archivedUrl))
				.header("Authorization", "Bot " + botToken)
				.header("Content-Type", "application/json")
				.GET()
				.build();

			HttpResponse<String> archivedResponse = httpClient.send(archivedRequest, HttpResponse.BodyHandlers.ofString());
			if(archivedResponse.statusCode() != 200){
				log.warn("Discord 보관 스레드 조회 실패: status={}, body={}", archivedResponse.statusCode(), archivedResponse.body());
				break;
			}

			JsonNode archivedData = objectMapper.readTree(archivedResponse.body());
			JsonNode archivedThreads = archivedData.get("threads");
			if(archivedThreads != null && archivedThreads.isArray()){
				for(JsonNode thread : archivedThreads){
					allThreads.add(thread);
				}
				if(!archivedThreads.isEmpty()){
					JsonNode lastThread = archivedThreads.get(archivedThreads.size() - 1);
					if(lastThread.has("thread_metadata") && lastThread.get("thread_metadata").has("archive_timestamp")){
						before = lastThread.get("thread_metadata").get("archive_timestamp").asText();
					}
				}
			}

			hasMore = archivedData.has("has_more") && archivedData.get("has_more").asBoolean();
		}

		log.info("포럼 채널 {} 스레드 총 {}개 (활성 + 보관)", channelId, allThreads.size());
		return objectMapper.valueToTree(allThreads);
	}
}
