package com.example.mobinogi.service.notion;

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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotionSyncService{

	@Value("${notion.api.token:}")
	private String notionToken;

	@Value("${notion.database.id:}")
	private String databaseId;

	@Value("${notion.sync.enabled:true}")
	private boolean syncEnabled;

	private final ObjectMapper objectMapper;

	private static final String NOTION_API_BASE = "https://api.notion.com/v1";
	private static final String NOTION_VERSION = "2022-06-28";

	private final List<BoardPostDto> cachedPosts = new CopyOnWriteArrayList<>();

	public List<BoardPostDto> getCachedPosts(){
		return Collections.unmodifiableList(cachedPosts);
	}

	public void syncNotionPages(){
		if(!syncEnabled || notionToken == null || notionToken.isEmpty()
			|| databaseId == null || databaseId.isEmpty()){
			log.debug("Notion 동기화가 비활성화되었거나 설정이 없습니다.");
			return;
		}

		try{
			List<BoardPostDto> newPosts = new ArrayList<>();
			String nextCursor = null;
			boolean hasMore = true;

			while(hasMore){
				JsonNode response = queryDatabase(nextCursor);
				if(response == null)
					break;

				JsonNode results = response.get("results");
				if(results != null && results.isArray()){
					for(JsonNode page : results){
						BoardPostDto dto = parseDatabasePage(page);
						if(dto != null){
							newPosts.add(dto);
						}
					}
				}

				hasMore = response.has("has_more") && response.get("has_more").asBoolean();
				nextCursor = response.has("next_cursor") && !response.get("next_cursor").isNull()
					? response.get("next_cursor").asText() : null;
			}

			// 날짜 내림차순 정렬 후 캐시 교체
			newPosts.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
			cachedPosts.clear();
			cachedPosts.addAll(newPosts);

			log.info("Notion 동기화 완료: {}개 페이지 캐시 저장", newPosts.size());
		}catch(Exception e){
			log.error("Notion 동기화 실패: {}", e.getMessage());
		}
	}

	private BoardPostDto parseDatabasePage(JsonNode page){
		try{
			String pageId = page.get("id").asText();
			JsonNode properties = page.get("properties");
			if(properties == null)
				return null;

			// 제목 (Title)
			String title = extractTitle(properties);
			if(title.isEmpty())
				title = "(제목 없음)";

			// 날짜 (Date)
			LocalDateTime dateTime = extractDate(properties);

			// 설명 (Rich Text)
			String description = extractRichTextProperty(properties, "설명");

			// 이미지 (Files)
			List<String> imageUrls = extractFiles(properties, "이미지");

			// 태그 (Multi-select or Select) → 카테고리명
			List<String> tags = extractTags(properties, "태그");
			String categoryName = (tags != null && !tags.isEmpty()) ? tags.get(0) : null;

			// 본문 구성
			StringBuilder content = new StringBuilder();
			if(!description.isEmpty()){
				content.append(description);
			}
			if(!imageUrls.isEmpty()){
				content.append("\n\n");
				for(String imageUrl : imageUrls){
					content.append("![이미지](").append(imageUrl).append(")\n");
				}
			}

			String finalContent = content.toString().trim();
			if(finalContent.isEmpty())
				finalContent = "(내용 없음)";

			// 페이지 URL 구성
			String url = "https://notion.so/" + pageId.replace("-", "");

			// createdAt 결정: 날짜 속성 > page created_time > now
			LocalDateTime createdAt = dateTime;
			if(createdAt == null && page.has("created_time")){
				try{
					createdAt = OffsetDateTime.parse(page.get("created_time").asText()).toLocalDateTime();
				}catch(Exception ignored){
				}
			}
			if(createdAt == null)
				createdAt = LocalDateTime.now();

			return BoardPostDto.builder()
				.postId(null)
				.title(title)
				.content(finalContent)
				.sourceType("NOTION")
				.externalUrl(url)
				.externalAuthor("Notion")
				.authorNickname("Notion")
				.categoryName(categoryName)
				.viewCount(0)
				.commentCount(0L)
				.createdAt(createdAt)
				.build();
		}catch(Exception e){
			String pageId = page.has("id") ? page.get("id").asText() : "unknown";
			log.warn("Notion 데이터베이스 페이지 파싱 실패 ({}): {}", pageId, e.getMessage());
			return null;
		}
	}

	/**
	 * 제목 (Title 타입) 속성 추출
	 */
	private String extractTitle(JsonNode properties){
		JsonNode titleProp = properties.get("제목");
		if(titleProp == null){
			var fields = properties.fields();
			while(fields.hasNext()){
				var entry = fields.next();
				JsonNode prop = entry.getValue();
				if(prop.has("type") && "title".equals(prop.get("type").asText())){
					titleProp = prop;
					break;
				}
			}
		}
		if(titleProp == null)
			return "";

		JsonNode titleArray = titleProp.get("title");
		if(titleArray == null || !titleArray.isArray())
			return "";

		StringBuilder sb = new StringBuilder();
		for(JsonNode text : titleArray){
			if(text.has("plain_text")){
				sb.append(text.get("plain_text").asText());
			}
		}
		return sb.toString();
	}

	/**
	 * 날짜 (Date 타입) 속성 추출
	 */
	private LocalDateTime extractDate(JsonNode properties){
		JsonNode dateProp = properties.get("날짜");
		if(dateProp == null)
			return null;

		JsonNode dateNode = dateProp.get("date");
		if(dateNode == null || dateNode.isNull())
			return null;

		String start = dateNode.has("start") ? dateNode.get("start").asText() : null;
		if(start == null || start.isEmpty())
			return null;

		try{
			return OffsetDateTime.parse(start).toLocalDateTime();
		}catch(Exception e1){
			try{
				return LocalDate.parse(start).atStartOfDay();
			}catch(Exception e2){
				return null;
			}
		}
	}

	/**
	 * Rich Text 속성 추출
	 */
	private String extractRichTextProperty(JsonNode properties, String propertyName){
		JsonNode prop = properties.get(propertyName);
		if(prop == null)
			return "";

		JsonNode richText = prop.get("rich_text");
		if(richText == null || !richText.isArray())
			return "";

		StringBuilder sb = new StringBuilder();
		for(JsonNode text : richText){
			if(text.has("plain_text")){
				sb.append(text.get("plain_text").asText());
			}
		}
		return sb.toString();
	}

	/**
	 * Files 속성에서 URL 목록 추출
	 */
	private List<String> extractFiles(JsonNode properties, String propertyName){
		List<String> urls = new ArrayList<>();
		JsonNode prop = properties.get(propertyName);
		if(prop == null)
			return urls;

		JsonNode files = prop.get("files");
		if(files == null || !files.isArray())
			return urls;

		for(JsonNode file : files){
			if(file.has("file") && file.get("file").has("url")){
				urls.add(file.get("file").get("url").asText());
			}else if(file.has("external") && file.get("external").has("url")){
				urls.add(file.get("external").get("url").asText());
			}
		}
		return urls;
	}

	/**
	 * 태그 (Multi-select 또는 Select) 속성 추출
	 */
	private List<String> extractTags(JsonNode properties, String propertyName){
		List<String> tags = new ArrayList<>();
		JsonNode prop = properties.get(propertyName);
		if(prop == null)
			return tags;

		String type = prop.has("type") ? prop.get("type").asText() : "";

		if("multi_select".equals(type)){
			JsonNode multiSelect = prop.get("multi_select");
			if(multiSelect != null && multiSelect.isArray()){
				for(JsonNode option : multiSelect){
					if(option.has("name")){
						tags.add(option.get("name").asText());
					}
				}
			}
		}else if("select".equals(type)){
			JsonNode select = prop.get("select");
			if(select != null && !select.isNull() && select.has("name")){
				tags.add(select.get("name").asText());
			}
		}

		return tags;
	}

	/**
	 * 데이터베이스 쿼리 (POST /databases/{id}/query)
	 */
	private JsonNode queryDatabase(String startCursor) throws Exception{
		String url = NOTION_API_BASE + "/databases/" + databaseId + "/query";

		String body;
		if(startCursor != null){
			body = "{\"start_cursor\":\"" + startCursor + "\",\"page_size\":100}";
		}else{
			body = "{\"page_size\":100}";
		}

		HttpClient httpClient = HttpClient.newHttpClient();
		HttpRequest request = HttpRequest.newBuilder()
			.uri(URI.create(url))
			.header("Authorization", "Bearer " + notionToken)
			.header("Notion-Version", NOTION_VERSION)
			.header("Content-Type", "application/json")
			.POST(HttpRequest.BodyPublishers.ofString(body))
			.build();

		HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

		if(response.statusCode() != 200){
			log.error("Notion API 오류: status={}, body={}", response.statusCode(), response.body());
			throw new RuntimeException("Notion API error: " + response.statusCode());
		}

		return objectMapper.readTree(response.body());
	}
}
