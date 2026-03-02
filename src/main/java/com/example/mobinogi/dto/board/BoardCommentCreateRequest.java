package com.example.mobinogi.dto.board;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardCommentCreateRequest{
	/**
	 * Field parentCommentId.
	 */
	private Long parentCommentId;
	/**
	 * Field content.
	 */
	private String content;
}
