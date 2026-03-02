package com.example.mobinogi.dto.hole;

import com.example.mobinogi.entity.life.HoleAlarm;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
/**
 * 구멍 알림 응답 DTO입니다.
 */
public class HoleAlarmDto{

	/** 알림 식별자 */
	private Long id;

	/** 구멍 타입 문자열(DEEP/ABYSS) */
	private String holeType;

	/** 지역명 */
	private String regionName;

	/** 구멍 수량 */
	private Integer holeCount;

	/** 구멍 종료 시각 */
	private LocalDateTime holeEndTime;

	/** 심연 개방 시각 */
	private LocalDateTime abyssOpenTime;

	/** 알림 트리거 시각 */
	private LocalDateTime triggerTime;

	/**
	 * 엔티티를 API 응답 DTO로 변환합니다.
	 *
	 * @param entity 원본 알림 엔티티
	 * @return 변환된 알림 DTO
	 */
	public static HoleAlarmDto fromEntity(HoleAlarm entity){
		// 현재 규칙에서는 holeEndTime을 트리거 기준 시각으로 사용합니다.
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
