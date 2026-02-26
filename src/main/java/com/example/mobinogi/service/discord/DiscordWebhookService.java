package com.example.mobinogi.service.discord;

import com.example.mobinogi.entity.BoardPost;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DiscordWebhookService{

	@Value("${discord.webhook.url:}")
	private String webhookUrl;

	@Value("${app.url:https://laetipark.me}")
	private String appUrl;

	private final ObjectMapper objectMapper;

	@Async
	public void sendNewPostNotification(BoardPost post){
		if(webhookUrl == null || webhookUrl.isEmpty()){
			log.debug("Discord webhook URL이 설정되지 않아 알림을 건너뜁니다.");
			return;
		}

		try{
			String slug = post.getTitle() == null
				? ""
				: post.getTitle().trim()
					.replaceAll("[^\\p{L}\\p{N}]+", "-")
					.replaceAll("-+", "-")
					.replaceAll("^-|-$", "");
			String postUrl = slug.isEmpty()
				? appUrl + "/board"
				: appUrl + "/board/" + slug;
			String authorName = (post.getUser() != null && post.getUser().getNickname() != null)
				? post.getUser().getNickname()
				: "익명";
			String categoryName = (post.getCategory() != null)
				? post.getCategory().getCategoryName()
				: "일반";

			String contentPreview = post.getContent();
			if(contentPreview.length() > 200){
				contentPreview = contentPreview.substring(0, 200) + "...";
			}

			Map<String, Object> embed = new HashMap<>();
			embed.put("title", "새 게시글: " + post.getTitle());
			embed.put("description", contentPreview);
			embed.put("url", postUrl);
			embed.put("color", 0x5865F2);

			Map<String, String> author = new HashMap<>();
			author.put("name", authorName);
			embed.put("author", author);

			Map<String, String> footer = new HashMap<>();
			footer.put("text", "카테고리: " + categoryName);
			embed.put("footer", footer);

			Map<String, Object> payload = new HashMap<>();
			payload.put("username", "Mobinogi 게시판");
			payload.put("embeds", List.of(embed));

			String jsonBody = objectMapper.writeValueAsString(payload);

			HttpClient httpClient = HttpClient.newHttpClient();
			HttpRequest httpRequest = HttpRequest.newBuilder()
				.uri(URI.create(webhookUrl))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(jsonBody))
				.build();

			HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

			if(response.statusCode() >= 200 && response.statusCode() < 300){
				log.info("Discord 알림 전송 성공: postId={}", post.getPostId());
			}else{
				log.error("Discord webhook 실패: status={}", response.statusCode());
			}
		}catch(Exception e){
			log.error("Discord 알림 전송 중 오류: {}", e.getMessage());
		}
	}
}
