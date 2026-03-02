package com.example.mobinogi.controller.hole;

import com.example.mobinogi.dto.hole.CreateAbyssHoleAlarmRequest;
import com.example.mobinogi.dto.hole.CreateDeepHoleAlarmRequest;
import com.example.mobinogi.dto.hole.HoleAlarmDto;
import com.example.mobinogi.entity.life.HoleType;
import com.example.mobinogi.service.hole.HoleAlarmService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/hole-alarms")
@RequiredArgsConstructor
public class HoleAlarmController{

	/** 구멍 알림 비즈니스 로직 서비스 */
	private final HoleAlarmService holeAlarmService;

	/**
	 * 문자열 holeType을 enum으로 파싱합니다.
	 *
	 * @param holeType 요청 holeType 문자열
	 * @return 파싱된 HoleType
	 */
	private HoleType parseHoleType(String holeType){
		try{
			return HoleType.valueOf(holeType.trim().toUpperCase(Locale.ROOT));
		}catch(Exception e){
			throw new RuntimeException("Invalid holeType. Use DEEP or ABYSS.");
		}
	}

	/**
	 * nullable holeType을 파싱합니다.
	 *
	 * @param holeType 요청 holeType 문자열
	 * @return 파싱된 HoleType, 없으면 null
	 */
	private HoleType parseNullableHoleType(String holeType){
		if(holeType == null || holeType.trim().isEmpty()){
			return null;
		}
		return parseHoleType(holeType);
	}

	/**
	 * 구멍 알림 목록을 조회합니다.
	 *
	 * @param holeType 구멍 타입 필터
	 * @return 알림 목록 응답
	 */
	@GetMapping
	public ResponseEntity<?> getAlarms(@RequestParam(required = false) String holeType){
		try{
			HoleType parsed = parseNullableHoleType(holeType);
			List<HoleAlarmDto> alarms = holeAlarmService.getAlarms(parsed);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("alarms", alarms);
			response.put("count", alarms.size());
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> response = new HashMap<>();
			response.put("success", false);
			response.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(response);
		}
	}

	/**
	 * 심층 구멍(DEEP) 알림을 생성합니다.
	 *
	 * @param request 생성 요청
	 * @return 생성된 알림 응답
	 */
	@PostMapping("/deep")
	public ResponseEntity<?> createDeepAlarm(@RequestBody CreateDeepHoleAlarmRequest request){
		try{
			HoleAlarmDto alarm = holeAlarmService.createDeepAlarm(
				request.getRegionName(),
				request.getEndTime(),
				request.getHoleCount()
			);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("alarm", alarm);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> response = new HashMap<>();
			response.put("success", false);
			response.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(response);
		}
	}

	/**
	 * 심연 구멍(ABYSS) 알림을 생성합니다.
	 *
	 * @param request 생성 요청
	 * @return 생성된 알림 및 자동 보충 목록
	 */
	@PostMapping("/abyss")
	public ResponseEntity<?> createAbyssAlarm(@RequestBody CreateAbyssHoleAlarmRequest request){
		try{
			HoleAlarmService.CreateAbyssResult result = holeAlarmService.createAbyssAlarm(
				request.getOpenTime()
			);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("alarm", result.getAlarm());
			response.put("generated", result.getGenerated());
			response.put("generatedCount", result.getGenerated().size());
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> response = new HashMap<>();
			response.put("success", false);
			response.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(response);
		}
	}

	/**
	 * 구멍 알림을 소비 처리합니다.
	 *
	 * @param alarmId 소비할 알림 ID
	 * @return 소비 결과 및 자동 보충 목록
	 */
	@PostMapping("/{alarmId}/consume")
	public ResponseEntity<?> consumeAlarm(@PathVariable Long alarmId){
		try{
			HoleAlarmService.ConsumeResult result = holeAlarmService.consumeAlarm(alarmId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("consumedId", result.getConsumedId());
			response.put("holeType", result.getHoleType());
			response.put("generated", result.getGenerated());
			response.put("generatedCount", result.getGenerated().size());
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> response = new HashMap<>();
			response.put("success", false);
			response.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(response);
		}
	}

	/**
	 * 특정 지역의 DEEP 알림을 삭제합니다.
	 *
	 * @param regionName 지역명
	 * @return 삭제 건수 응답
	 */
	@DeleteMapping("/deep")
	public ResponseEntity<?> deleteDeepByRegion(@RequestParam String regionName){
		try{
			long deletedCount = holeAlarmService.deleteDeepByRegion(regionName);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("deletedCount", deletedCount);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> response = new HashMap<>();
			response.put("success", false);
			response.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(response);
		}
	}

	/**
	 * 타입별 알림을 일괄 삭제합니다.
	 *
	 * @param holeType 구멍 타입
	 * @return 삭제 건수 응답
	 */
	@DeleteMapping("/type/{holeType}")
	public ResponseEntity<?> clearByType(@PathVariable String holeType){
		try{
			HoleType parsed = parseHoleType(holeType);
			long deletedCount = holeAlarmService.clearByType(parsed);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("deletedCount", deletedCount);
			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> response = new HashMap<>();
			response.put("success", false);
			response.put("message", e.getMessage());
			return ResponseEntity.badRequest().body(response);
		}
	}
}
