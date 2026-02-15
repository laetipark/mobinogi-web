package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.GameNotice;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameNoticeDto{

	private String noticeId;
	private String noticeType;
	private String title;
	private LocalDate publishedDate;

	public static GameNoticeDto fromEntity(GameNotice notice){
		return GameNoticeDto.builder()
			.noticeId(notice.getNoticeId())
			.noticeType(notice.getNoticeType())
			.title(notice.getTitle())
			.publishedDate(notice.getPublishedDate())
			.build();
	}
}
