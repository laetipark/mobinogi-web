package com.example.mobinogi.dto.board;

import com.example.mobinogi.entity.board.BoardComment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Board comment DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardCommentDto{

	/** Comment ID. */
	private Long commentId;

	/** Post ID. */
	private Long postId;

	/** Author user ID. */
	private Long userId;

	/** Author nickname. */
	private String authorNickname;

	/** Author profile image URL. */
	private String authorProfileImage;

	/** Parent comment ID for threaded replies. */
	private Long parentCommentId;

	/** Comment content. */
	private String content;

	/** Created timestamp. */
	private LocalDateTime createdAt;

	/** Updated timestamp. */
	private LocalDateTime updatedAt;

	/** Nested reply DTO list. */
	private List<BoardCommentDto> replies;

	/**
	 * Converts entity to DTO.
	 *
	 * @param entity board comment entity
	 * @return DTO instance
	 */
	public static BoardCommentDto fromEntity(BoardComment entity){
		String authorNickname = null;
		String authorProfileImage = null;

		if(entity.getUser() != null){
			authorNickname = entity.getUser().getNickname();
			authorProfileImage = entity.getUser().getProfileImage();
		}

		return BoardCommentDto.builder()
			.commentId(entity.getCommentId())
			.postId(entity.getPostId())
			.userId(entity.getUserId())
			.authorNickname(authorNickname)
			.authorProfileImage(authorProfileImage)
			.parentCommentId(entity.getParentCommentId())
			.content(entity.getContent())
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}
}
