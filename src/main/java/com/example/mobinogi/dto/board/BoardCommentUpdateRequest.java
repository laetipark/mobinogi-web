package com.example.mobinogi.dto.board;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardCommentUpdateRequest{
	private String content;
}
