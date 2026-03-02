package com.example.mobinogi.dto.board;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardPostUpdateRequest{
	/**
	 * Field categoryId.
	 */
	private Long categoryId;
	/**
	 * Field title.
	 */
	private String title;
	/**
	 * Field content.
	 */
	private String content;
	/**
	 * Field isWiki.
	 */
	private Boolean isWiki;
}
