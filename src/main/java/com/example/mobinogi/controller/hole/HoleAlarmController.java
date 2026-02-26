package com.example.mobinogi.controller.hole;

import com.example.mobinogi.dto.hole.CreateAbyssHoleAlarmRequest;
import com.example.mobinogi.dto.hole.CreateDeepHoleAlarmRequest;
import com.example.mobinogi.dto.hole.HoleAlarmDto;
import com.example.mobinogi.entity.HoleType;
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

	private final HoleAlarmService holeAlarmService;

	private HoleType parseHoleType(String holeType){
		try{
			return HoleType.valueOf(holeType.trim().toUpperCase(Locale.ROOT));
		}catch(Exception e){
			throw new RuntimeException("Invalid holeType. Use DEEP or ABYSS.");
		}
	}

	private HoleType parseNullableHoleType(String holeType){
		if(holeType == null || holeType.trim().isEmpty()){
			return null;
		}
		return parseHoleType(holeType);
	}

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
