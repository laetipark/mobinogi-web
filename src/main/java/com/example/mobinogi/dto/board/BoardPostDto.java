package com.example.mobinogi.dto.board;

import com.example.mobinogi.entity.BoardPost;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardPostDto{
	private Long postId;
	private Long categoryId;
	private String categoryName;
	private Long userId;
	private String authorNickname;
	private String authorProfileImage;
	private String authorDiscordId;
	private String title;
	private String content;
	private Integer viewCount;
	private String sourceType;
	private String externalUrl;
	private String externalAuthor;
	private Boolean isWiki;
	private Long commentCount;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;

	// 외부 게시물 전용 필드 (Redis에서 조회)
	private String externalId;  // 외부 시스템의 ID
	private String source;       // NOTION, DISCORD
	private String url;          // 원본 URL
	private List<String> tags;   // 태그 목록
	private List<String> images; // 이미지 URL 목록
	private String createdAtString;  // ISO 문자열 형태의 생성일

	public static BoardPostDto fromEntity(BoardPost entity, long commentCount){
		String authorNickname = null;
		String authorProfileImage = null;
		String categoryName = null;

		if(entity.getUser() != null){
			authorNickname = entity.getUser().getNickname();
			authorProfileImage = entity.getUser().getProfileImage();
		}

		if(entity.getCategory() != null){
			categoryName = entity.getCategory().getCategoryName();
		}

		// 외부 소스 게시글은 외부 작성자명 사용
		if(!"USER".equals(entity.getSourceType()) && entity.getExternalAuthor() != null){
			authorNickname = entity.getExternalAuthor();
		}

		return BoardPostDto.builder()
			.postId(entity.getPostId())
			.categoryId(entity.getCategoryId())
			.categoryName(categoryName)
			.userId(entity.getUserId())
			.authorNickname(authorNickname)
			.authorProfileImage(authorProfileImage)
			.title(entity.getTitle())
			.content(entity.getContent())
			.viewCount(entity.getViewCount())
			.sourceType(entity.getSourceType())
			.externalUrl(entity.getExternalUrl())
			.externalAuthor(entity.getExternalAuthor())
			.isWiki(entity.getIsWiki())
			.commentCount(commentCount)
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}
}
