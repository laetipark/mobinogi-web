package com.example.mobinogi.dto.board;

import com.example.mobinogi.entity.BoardPost;
import lombok.*;
import java.time.LocalDateTime;

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
	private String title;
	private String content;
	private Integer viewCount;
	private String sourceType;
	private String externalUrl;
	private String externalAuthor;
	private Long commentCount;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;

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
			.commentCount(commentCount)
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}
}
