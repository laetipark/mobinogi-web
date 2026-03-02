package com.example.mobinogi.dto.board;

import com.example.mobinogi.entity.board.BoardPostHistory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Board post edit history DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardPostHistoryDto{

	/** History row ID. */
	private Long historyId;

	/** Post ID. */
	private Long postId;

	/** Editor user ID. */
	private Long userId;

	/** Editor nickname. */
	private String editorNickname;

	/** Snapshot title. */
	private String title;

	/** Snapshot content. */
	private String content;

	/** Snapshot created timestamp. */
	private LocalDateTime createdAt;

	/**
	 * Converts entity to DTO.
	 *
	 * @param entity board post history entity
	 * @return DTO instance
	 */
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
