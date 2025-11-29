package com.example.mobinogi.controller.rank;

import com.example.mobinogi.scheduler.RankScheduler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/rank")
public class RankController{
	
	private final RankScheduler rankScheduler;
	
	@Autowired
	public RankController(RankScheduler rankScheduler){
		this.rankScheduler = rankScheduler;
	}
	
	/**
	 * 랭킹 데이터 수집을 수동으로 실행합니다.
	 * POST /api/rank/fetch - 동기 실행 (완료될 때까지 대기)
	 */
	@RequestMapping(value = "/fetch", method = RequestMethod.POST)
	public ResponseEntity<Map<String, Object>> fetchRankDataSync(){
		Map<String, Object> response = new HashMap<>();
		
		try{
			long startTime = System.currentTimeMillis();
			
			rankScheduler.fetchRankData();
			
			long endTime = System.currentTimeMillis();
			long executionTime = endTime - startTime;
			
			response.put("status", "success");
			response.put("message", "Rank data collection completed successfully");
			response.put("executionTimeMs", executionTime);
			response.put("executionTimeSec", executionTime / 1000.0);
			
			return ResponseEntity.ok(response);
			
		}catch(Exception e){
			response.put("status", "error");
			response.put("message", "Failed to collect rank data: " + e.getMessage());
			response.put("error", e.getClass().getSimpleName());
			
			return ResponseEntity.internalServerError().body(response);
		}
	}
	
	/**
	 * 랭킹 데이터 수집을 비동기로 실행합니다.
	 * POST /api/rank/fetch-async - 비동기 실행 (즉시 응답)
	 */
	@RequestMapping(value = "/fetch-async", method = RequestMethod.POST)
	public ResponseEntity<Map<String, Object>> fetchRankDataAsync(){
		Map<String, Object> response = new HashMap<>();
		
		try{
			// 비동기로 실행
			CompletableFuture.runAsync(() -> {
				try{
					rankScheduler.fetchRankData();
				}catch(Exception e){
					System.err.println("Async rank data collection failed: " + e.getMessage());
				}
			});
			
			response.put("status", "started");
			response.put("message", "Rank data collection started asynchronously");
			response.put("note", "Check server logs for progress and completion status");
			
			return ResponseEntity.accepted().body(response);
			
		}catch(Exception e){
			response.put("status", "error");
			response.put("message", "Failed to start async rank data collection: " + e.getMessage());
			response.put("error", e.getClass().getSimpleName());
			
			return ResponseEntity.internalServerError().body(response);
		}
	}
	
	/**
	 * 서버 인스턴스 정보를 확인합니다.
	 * GET /api/rank/server-info
	 */
	@GetMapping("/server-info")
	public ResponseEntity<Map<String, Object>> getServerInfo(){
		Map<String, Object> response = new HashMap<>();
		
		try{
			// RankScheduler에서 서버 정보 가져오기 (리플렉션 사용)
			java.lang.reflect.Field instanceIdField = rankScheduler.getClass().getDeclaredField("serverInstanceId");
			java.lang.reflect.Field totalInstancesField = rankScheduler.getClass().getDeclaredField("totalServerInstances");
			
			instanceIdField.setAccessible(true);
			totalInstancesField.setAccessible(true);
			
			int serverInstanceId = instanceIdField.getInt(rankScheduler);
			int totalServerInstances = totalInstancesField.getInt(rankScheduler);
			
			response.put("serverInstanceId", serverInstanceId);
			response.put("totalServerInstances", totalServerInstances);
			response.put("serverName", "Server-" + (serverInstanceId + 1));
			response.put("status", "active");
			
			return ResponseEntity.ok(response);
			
		}catch(Exception e){
			response.put("status", "error");
			response.put("message", "Failed to get server info: " + e.getMessage());
			
			return ResponseEntity.internalServerError().body(response);
		}
	}
}
