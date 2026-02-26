package com.example.mobinogi.dto.hole;

import com.example.mobinogi.entity.HoleAlarm;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HoleAlarmDto{

	private Long id;
	private String holeType;
	private String regionName;
	private Integer holeCount;
	private LocalDateTime holeEndTime;
	private LocalDateTime abyssOpenTime;
	private LocalDateTime triggerTime;

	public static HoleAlarmDto fromEntity(HoleAlarm entity){
		LocalDateTime triggerTime = entity.getHoleEndTime();

		return HoleAlarmDto.builder()
			.id(entity.getId())
			.holeType(entity.getHoleType() != null ? entity.getHoleType().name() : null)
			.regionName(entity.getRegionName())
			.holeCount(entity.getHoleCount())
			.holeEndTime(entity.getHoleEndTime())
			.abyssOpenTime(entity.getAbyssOpenTime())
			.triggerTime(triggerTime)
			.build();
	}
}
