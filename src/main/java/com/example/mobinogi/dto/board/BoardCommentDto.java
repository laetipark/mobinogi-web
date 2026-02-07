package com.example.mobinogi.dto.board;

import com.example.mobinogi.entity.BoardComment;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardCommentDto{
	private Long commentId;
	private Long postId;
	private Long userId;
	private String authorNickname;
	private String authorProfileImage;
	private Long parentCommentId;
	private String content;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
	private List<BoardCommentDto> replies;

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
