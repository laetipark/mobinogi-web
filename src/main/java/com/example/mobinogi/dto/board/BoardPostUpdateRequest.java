package com.example.mobinogi.dto.board;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardPostUpdateRequest{
	private Long categoryId;
	private String title;
	private String content;
	private Boolean isWiki;
}
