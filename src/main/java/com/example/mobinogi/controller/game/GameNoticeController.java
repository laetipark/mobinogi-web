package com.example.mobinogi.controller.game;

import com.example.mobinogi.dto.game.GameNoticeDto;
import com.example.mobinogi.service.game.GameNoticeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
@Slf4j
public class GameNoticeController{

	private static final String INTERNAL_SERVER_ERROR_MESSAGE = "Failed to fetch notices.";
	private final GameNoticeService gameNoticeService;

	@GetMapping
	public ResponseEntity<Map<String, Object>> getNotices(@RequestParam(required = false) String category){
		try{
			List<GameNoticeDto> notices = gameNoticeService.getNotices(category);
			return ResponseEntity.ok(successResponse(notices));
		}catch(IllegalArgumentException e){
			return ResponseEntity.badRequest().body(failureResponse(e.getMessage()));
		}catch(Exception e){
			log.error("Failed to fetch notices. category={}", category, e);
			return ResponseEntity.internalServerError().body(failureResponse(INTERNAL_SERVER_ERROR_MESSAGE));
		}
	}

	private Map<String, Object> successResponse(List<GameNoticeDto> notices){
		Map<String, Object> response = new LinkedHashMap<>();
		response.put("success", true);
		response.put("data", notices);
		return response;
	}

	private Map<String, Object> failureResponse(String message){
		Map<String, Object> response = new LinkedHashMap<>();
		response.put("success", false);
		response.put("message", message);
		return response;
	}
}
