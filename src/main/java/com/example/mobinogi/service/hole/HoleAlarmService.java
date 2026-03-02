package com.example.mobinogi.service.hole;

import com.example.mobinogi.dto.hole.HoleAlarmDto;
import com.example.mobinogi.entity.life.HoleAlarm;
import com.example.mobinogi.entity.life.HoleType;
import com.example.mobinogi.repository.HoleAlarmRepository;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class HoleAlarmService{

	/** 심연 리스폰 간격(분) */
	private static final long ABYSS_INTERVAL_MINUTES = 36L * 60L + 15L;

	/** 심연 오픈 지속 시간(분) */
	private static final long ABYSS_OPEN_DURATION_MINUTES = 15L;

	/** 심연 큐 자동 보충 개수 */
	private static final int ABYSS_REFILL_COUNT = 10;

	/** 구멍 알림 리포지토리 */
	private final HoleAlarmRepository holeAlarmRepository;

	@Getter
	@AllArgsConstructor
	public static class CreateAbyssResult{
		/**
		 * Field alarm.
		 */
		private HoleAlarmDto alarm;
		/**
		 * Field generated.
		 */
		private List<HoleAlarmDto> generated;
	}

	@Getter
	@AllArgsConstructor
	public static class ConsumeResult{
		/**
		 * Field consumedId.
		 */
		private Long consumedId;
		/**
		 * Field holeType.
		 */
		private String holeType;
		/**
		 * Field generated.
		 */
		private List<HoleAlarmDto> generated;
	}

	/**
	 * 알림 정렬/큐 보충 기준이 되는 트리거 시각을 계산합니다.
	 *
	 * @param alarm 구멍 알림 엔티티
	 * @return 기준 시각
	 */
	private LocalDateTime getTriggerTime(HoleAlarm alarm){
		if(alarm.getHoleEndTime() != null){
			return alarm.getHoleEndTime();
		}
		if(alarm.getHoleType() == HoleType.ABYSS && alarm.getAbyssOpenTime() != null){
			return alarm.getAbyssOpenTime().plusMinutes(ABYSS_OPEN_DURATION_MINUTES);
		}
		return null;
	}

	/**
	 * 구멍 알림 목록을 조회합니다.
	 *
	 * @param holeType 필터 타입
	 * @return 정렬된 알림 DTO 목록
	 */
	@Transactional(readOnly = true)
	public List<HoleAlarmDto> getAlarms(HoleType holeType){
		List<HoleAlarm> alarms = holeType == null
			? holeAlarmRepository.findAll()
			: holeAlarmRepository.findByHoleType(holeType);

		// 트리거 시각(끝나는 시각) 기준으로 정렬합니다.
		alarms.sort((a, b) -> {
			LocalDateTime aTime = getTriggerTime(a);
			LocalDateTime bTime = getTriggerTime(b);
			if(aTime == null && bTime == null){
				return Long.compare(
					a.getId() == null ? 0L : a.getId(),
					b.getId() == null ? 0L : b.getId()
				);
			}
			if(aTime == null){
				return 1;
			}
			if(bTime == null){
				return -1;
			}
			return aTime.compareTo(bTime);
		});

		return alarms.stream()
			.map(HoleAlarmDto::fromEntity)
			.toList();
	}

	/**
	 * DEEP 알림을 생성합니다.
	 *
	 * @param regionName 지역명
	 * @param endTime 종료 시각
	 * @param holeCount 구멍 수
	 * @return 생성된 알림 DTO
	 */
	@Transactional
	public HoleAlarmDto createDeepAlarm(String regionName, LocalDateTime endTime, Integer holeCount){
		if(regionName == null || regionName.trim().isEmpty()){
			throw new RuntimeException("regionName is required.");
		}
		if(endTime == null){
			throw new RuntimeException("endTime is required.");
		}

		List<HoleAlarm> existing = holeAlarmRepository.findByHoleTypeAndRegionName(HoleType.DEEP, regionName.trim());
		if(!existing.isEmpty()){
			throw new RuntimeException("Deep hole alarm already exists for this region.");
		}

		HoleAlarm alarm = HoleAlarm.builder()
			.holeType(HoleType.DEEP)
			.regionName(regionName.trim())
			.holeCount(holeCount)
			.holeEndTime(endTime)
			.build();

		return HoleAlarmDto.fromEntity(holeAlarmRepository.save(alarm));
	}

	/**
	 * ABYSS 알림을 생성하고 큐를 보충합니다.
	 *
	 * @param openTime 오픈 시각
	 * @return 생성 결과 DTO
	 */
	@Transactional
	public CreateAbyssResult createAbyssAlarm(LocalDateTime openTime){
		if(openTime == null){
			throw new RuntimeException("openTime is required.");
		}

		// 심연은 단일 시작점 기준으로 큐를 재구성하므로 기존 심연 알림을 정리합니다.
		List<HoleAlarm> existingAbyssAlarms = holeAlarmRepository.findByHoleType(HoleType.ABYSS);
		if(!existingAbyssAlarms.isEmpty()){
			holeAlarmRepository.deleteAll(existingAbyssAlarms);
		}

		LocalDateTime holeEndTime = openTime.plusMinutes(ABYSS_OPEN_DURATION_MINUTES);

		HoleAlarm alarm = HoleAlarm.builder()
			.holeType(HoleType.ABYSS)
			.holeEndTime(holeEndTime)
			.abyssOpenTime(openTime)
			.build();

		HoleAlarm saved = holeAlarmRepository.save(alarm);
		List<HoleAlarmDto> generated = ensureAbyssQueueIfNeeded(saved.getHoleEndTime());

		return new CreateAbyssResult(HoleAlarmDto.fromEntity(saved), generated);
	}

	/**
	 * 알림을 소비 처리하고 필요한 경우 심연 큐를 보충합니다.
	 *
	 * @param alarmId 소비할 알림 ID
	 * @return 소비 결과 DTO
	 */
	@Transactional
	public ConsumeResult consumeAlarm(Long alarmId){
		HoleAlarm alarm = holeAlarmRepository.findById(alarmId)
			.orElseThrow(() -> new RuntimeException("Alarm not found."));

		LocalDateTime consumedBaseTime = alarm.getHoleEndTime();
		HoleType holeType = alarm.getHoleType();
		holeAlarmRepository.delete(alarm);

		List<HoleAlarmDto> generated = Collections.emptyList();
		if(holeType == HoleType.ABYSS){
			generated = ensureAbyssQueueIfNeeded(consumedBaseTime);
		}

		return new ConsumeResult(alarmId, holeType.name(), generated);
	}

	/**
	 * 특정 지역 DEEP 알림을 삭제합니다.
	 *
	 * @param regionName 지역명
	 * @return 삭제 건수
	 */
	@Transactional
	public long deleteDeepByRegion(String regionName){
		if(regionName == null || regionName.trim().isEmpty()){
			return 0;
		}
		List<HoleAlarm> targets = holeAlarmRepository.findByHoleTypeAndRegionName(HoleType.DEEP, regionName.trim());
		if(targets.isEmpty()){
			return 0;
		}
		long deletedCount = targets.size();
		holeAlarmRepository.deleteAll(targets);
		return deletedCount;
	}

	/**
	 * 타입별 알림을 일괄 삭제합니다.
	 *
	 * @param holeType 알림 타입
	 * @return 삭제 건수
	 */
	@Transactional
	public long clearByType(HoleType holeType){
		List<HoleAlarm> targets = holeAlarmRepository.findByHoleType(holeType);
		if(targets.isEmpty()){
			return 0;
		}
		long deletedCount = targets.size();
		holeAlarmRepository.deleteAll(targets);
		return deletedCount;
	}

	/**
	 * 심연 큐 길이가 짧을 때 알림을 자동 보충합니다.
	 *
	 * @param fallbackBaseTime 기준 시각 fallback
	 * @return 생성된 알림 DTO 목록
	 */
	@Transactional
	public List<HoleAlarmDto> ensureAbyssQueueIfNeeded(LocalDateTime fallbackBaseTime){
		List<HoleAlarm> current = holeAlarmRepository.findByHoleType(HoleType.ABYSS);
		if(current.size() > 1){
			return Collections.emptyList();
		}

		LocalDateTime baseTime = current.stream()
			.map(this::getTriggerTime)
			.filter(Objects::nonNull)
			.max(LocalDateTime::compareTo)
			.orElse(fallbackBaseTime != null ? fallbackBaseTime : LocalDateTime.now());

		Set<LocalDateTime> existingTimes = new HashSet<>();
		for(HoleAlarm alarm : current){
			LocalDateTime triggerTime = getTriggerTime(alarm);
			if(triggerTime != null){
				existingTimes.add(triggerTime);
			}
		}

		// 기존 시각과 중복되지 않도록 다음 알림들을 계산합니다.
		List<HoleAlarm> toCreate = new ArrayList<>();
		LocalDateTime cursor = baseTime;
		while(toCreate.size() < ABYSS_REFILL_COUNT){
			cursor = cursor.plusMinutes(ABYSS_INTERVAL_MINUTES);
			if(existingTimes.add(cursor)){
				toCreate.add(
					HoleAlarm.builder()
						.holeType(HoleType.ABYSS)
						.holeEndTime(cursor)
						.abyssOpenTime(cursor.minusMinutes(ABYSS_OPEN_DURATION_MINUTES))
						.build()
				);
			}
		}

		return holeAlarmRepository.saveAll(toCreate)
			.stream()
			.map(HoleAlarmDto::fromEntity)
			.toList();
	}
}
