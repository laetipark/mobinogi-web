package com.example.mobinogi.dto.user;

import lombok.Data;

@Data
public class GuildBoardPostCreateRequest{
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
}
