package com.example.mobinogi.repository;

import com.example.mobinogi.entity.HoleAlarm;
import com.example.mobinogi.entity.HoleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HoleAlarmRepository extends JpaRepository<HoleAlarm, Long>{

	List<HoleAlarm> findByHoleType(HoleType holeType);

	List<HoleAlarm> findByHoleTypeAndRegionName(HoleType holeType, String regionName);

	long countByHoleType(HoleType holeType);

	Optional<HoleAlarm> findTopByHoleTypeOrderByHoleEndTimeDesc(HoleType holeType);
}
