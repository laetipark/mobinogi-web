package com.example.mobinogi.repository;

import com.example.mobinogi.entity.life.HoleAlarm;
import com.example.mobinogi.entity.life.HoleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * 구멍 알림 엔티티 저장소입니다.
 */
public interface HoleAlarmRepository extends JpaRepository<HoleAlarm, Long>{

	/**
	 * 구멍 타입으로 알림 목록을 조회합니다.
	 *
	 * @param holeType 구멍 타입
	 * @return 타입별 알림 목록
	 */
	List<HoleAlarm> findByHoleType(HoleType holeType);

	/**
	 * 구멍 타입과 지역명으로 알림 목록을 조회합니다.
	 *
	 * @param holeType 구멍 타입
	 * @param regionName 지역명
	 * @return 조건에 맞는 알림 목록
	 */
	List<HoleAlarm> findByHoleTypeAndRegionName(HoleType holeType, String regionName);

	/**
	 * 구멍 타입별 알림 개수를 조회합니다.
	 *
	 * @param holeType 구멍 타입
	 * @return 알림 개수
	 */
	long countByHoleType(HoleType holeType);

	/**
	 * 구멍 종료 시각 기준 최신 알림 1건을 조회합니다.
	 *
	 * @param holeType 구멍 타입
	 * @return 최신 알림(optional)
	 */
	Optional<HoleAlarm> findTopByHoleTypeOrderByHoleEndTimeDesc(HoleType holeType);
}
