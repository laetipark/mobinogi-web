package com.example.mobinogi.dto.user;

import lombok.Data;

@Data
public class GuildBoardCategoryCreateRequest{
	/**
	 * Field name.
	 */
	private String name;
	/**
	 * Field sortOrder.
	 */
	private Integer sortOrder;
}

