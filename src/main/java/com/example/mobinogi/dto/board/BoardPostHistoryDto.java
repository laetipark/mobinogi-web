package com.example.mobinogi.dto.board;

import com.example.mobinogi.entity.BoardPostHistory;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardPostHistoryDto{
	private Long historyId;
	private Long postId;
	private Long userId;
	private String editorNickname;
	private String title;
	private String content;
	private LocalDateTime createdAt;

	public static BoardPostHistoryDto fromEntity(BoardPostHistory entity){
		String editorNickname = null;
		if(entity.getUser() != null){
			editorNickname = entity.getUser().getNickname();
		}

		return BoardPostHistoryDto.builder()
			.historyId(entity.getHistoryId())
			.postId(entity.getPostId())
			.userId(entity.getUserId())
			.editorNickname(editorNickname)
			.title(entity.getTitle())
			.content(entity.getContent())
			.createdAt(entity.getCreatedAt())
			.build();
	}
}
