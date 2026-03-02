package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.game.GameEvent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Game event DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameEventDto{

	/** Event ID. */
	private String eventId;

	/** Thumbnail URL. */
	private String thumbnail;

	/** Event title. */
	private String title;

	/** Event content/description. */
	private String content;

	/** Start datetime. */
	private LocalDateTime startDate;

	/** End datetime. */
	private LocalDateTime endDate;

	/** Flag for events ending soon. */
	private boolean endingSoon;

	/** Flag for permanent events. */
	private boolean permanent;

	/** Days left until end date (`-1` for permanent). */
	private long daysLeft;

	/**
	 * Converts entity to DTO and calculates derived flags.
	 *
	 * @param event event entity
	 * @return DTO instance
	 */
	public static GameEventDto fromEntity(GameEvent event){
		LocalDateTime now = LocalDateTime.now();
		long daysLeft = ChronoUnit.DAYS.between(now, event.getEndDate());
		boolean permanent = event.getEndDate().getYear() >= 2030;
		boolean endingSoon = !permanent && daysLeft <= 7 && daysLeft >= 0;

		return GameEventDto.builder()
			.eventId(event.getEventId())
			.thumbnail(event.getThumbnail())
			.title(event.getTitle())
			.content(event.getContent())
			.startDate(event.getStartDate())
			.endDate(event.getEndDate())
			.endingSoon(endingSoon)
			.permanent(permanent)
			.daysLeft(permanent ? -1 : daysLeft)
			.build();
	}
}
