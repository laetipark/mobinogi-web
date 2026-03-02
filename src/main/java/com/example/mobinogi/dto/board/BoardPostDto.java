package com.example.mobinogi.dto.board;

import com.example.mobinogi.entity.board.BoardPost;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Board post DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardPostDto{

	/** Post ID. */
	private Long postId;

	/** Category ID. */
	private Long categoryId;

	/** Category name. */
	private String categoryName;

	/** Author user ID. */
	private Long userId;

	/** Author nickname. */
	private String authorNickname;

	/** Author profile image URL. */
	private String authorProfileImage;

	/** Post title. */
	private String title;

	/** Post content. */
	private String content;

	/** View count. */
	private Integer viewCount;

	/** Wiki-mode flag. */
	private Boolean isWiki;

	/** Comment count summary. */
	private Long commentCount;

	/** Created timestamp. */
	private LocalDateTime createdAt;

	/** Updated timestamp. */
	private LocalDateTime updatedAt;

	/**
	 * Converts entity to DTO with comment count.
	 *
	 * @param entity board post entity
	 * @param commentCount aggregated comment count
	 * @return DTO instance
	 */
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
			.isWiki(entity.getIsWiki())
			.commentCount(commentCount)
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}
}
