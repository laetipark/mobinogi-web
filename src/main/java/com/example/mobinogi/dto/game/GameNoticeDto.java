package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.game.GameNotice;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Game notice DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameNoticeDto{

	/** Notice ID. */
	private String noticeId;

	/** Notice category/type. */
	private String noticeType;

	/** Notice title. */
	private String title;

	/** Notice publish date. */
	private LocalDate publishedDate;

	/**
	 * Converts entity to DTO.
	 *
	 * @param notice notice entity
	 * @return DTO instance
	 */
	public static GameNoticeDto fromEntity(GameNotice notice){
		return GameNoticeDto.builder()
			.noticeId(notice.getNoticeId())
			.noticeType(notice.getNoticeType())
			.title(notice.getTitle())
			.publishedDate(notice.getPublishedDate())
			.build();
	}
}
