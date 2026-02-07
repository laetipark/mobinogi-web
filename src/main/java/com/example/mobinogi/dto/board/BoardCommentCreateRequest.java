package com.example.mobinogi.dto.board;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardCommentCreateRequest{
	private Long parentCommentId;
	private String content;
}
