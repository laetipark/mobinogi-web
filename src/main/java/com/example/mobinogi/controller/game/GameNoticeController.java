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

/**
 * Game notice lookup controller.
 */
@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
@Slf4j
public class GameNoticeController{

	/** Generic failure message for notice API. */
	private static final String INTERNAL_SERVER_ERROR_MESSAGE = "Failed to fetch notices.";

	/** Notice service. */
	private final GameNoticeService gameNoticeService;

	/**
	 * Returns notice list with optional category.
	 *
	 * @param category optional category filter
	 * @return notice list response
	 */
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

	/**
	 * Builds success response body.
	 *
	 * @param notices notice list
	 * @return success response map
	 */
	private Map<String, Object> successResponse(List<GameNoticeDto> notices){
		Map<String, Object> response = new LinkedHashMap<>();
		response.put("success", true);
		response.put("data", notices);
		return response;
	}

	/**
	 * Builds failure response body.
	 *
	 * @param message error message
	 * @return failure response map
	 */
	private Map<String, Object> failureResponse(String message){
		Map<String, Object> response = new LinkedHashMap<>();
		response.put("success", false);
		response.put("message", message);
		return response;
	}
}
