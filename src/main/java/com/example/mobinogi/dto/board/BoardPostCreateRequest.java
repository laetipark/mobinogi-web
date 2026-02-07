package com.example.mobinogi.dto.board;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardPostCreateRequest{
	private Long categoryId;
	private String title;
	private String content;
}
