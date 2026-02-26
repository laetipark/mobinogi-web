package com.example.mobinogi.service.hole;

import com.example.mobinogi.dto.hole.HoleAlarmDto;
import com.example.mobinogi.entity.HoleAlarm;
import com.example.mobinogi.entity.HoleType;
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

	private static final long ABYSS_INTERVAL_MINUTES = 36L * 60L + 15L;
	private static final long ABYSS_OPEN_DURATION_MINUTES = 15L;
	private static final int ABYSS_REFILL_COUNT = 10;

	private final HoleAlarmRepository holeAlarmRepository;

	@Getter
	@AllArgsConstructor
	public static class CreateAbyssResult{
		private HoleAlarmDto alarm;
		private List<HoleAlarmDto> generated;
	}

	@Getter
	@AllArgsConstructor
	public static class ConsumeResult{
		private Long consumedId;
		private String holeType;
		private List<HoleAlarmDto> generated;
	}

	private LocalDateTime getTriggerTime(HoleAlarm alarm){
		if(alarm.getHoleEndTime() != null){
			return alarm.getHoleEndTime();
		}
		if(alarm.getHoleType() == HoleType.ABYSS && alarm.getAbyssOpenTime() != null){
			return alarm.getAbyssOpenTime().plusMinutes(ABYSS_OPEN_DURATION_MINUTES);
		}
		return null;
	}

	@Transactional(readOnly = true)
	public List<HoleAlarmDto> getAlarms(HoleType holeType){
		List<HoleAlarm> alarms = holeType == null
			? holeAlarmRepository.findAll()
			: holeAlarmRepository.findByHoleType(holeType);

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

	@Transactional
	public CreateAbyssResult createAbyssAlarm(LocalDateTime openTime){
		if(openTime == null){
			throw new RuntimeException("openTime is required.");
		}

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
