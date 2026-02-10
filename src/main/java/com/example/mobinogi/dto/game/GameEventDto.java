package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.GameEvent;
import lombok.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameEventDto{

	private String eventId;
	private String thumbnail;
	private String title;
	private LocalDateTime startDate;
	private LocalDateTime endDate;
	private boolean endingSoon;
	private boolean permanent;
	private long daysLeft;

	public static GameEventDto fromEntity(GameEvent event){
		LocalDateTime now = LocalDateTime.now();
		long daysLeft = ChronoUnit.DAYS.between(now, event.getEndDate());
		boolean permanent = event.getEndDate().getYear() >= 2030;
		boolean endingSoon = !permanent && daysLeft <= 7 && daysLeft >= 0;

		return GameEventDto.builder()
			.eventId(event.getEventId())
			.thumbnail(event.getThumbnail())
			.title(event.getTitle())
			.startDate(event.getStartDate())
			.endDate(event.getEndDate())
			.endingSoon(endingSoon)
			.permanent(permanent)
			.daysLeft(permanent ? -1 : daysLeft)
			.build();
	}
}
