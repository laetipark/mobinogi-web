package com.example.mobinogi.controller.game;

import com.example.mobinogi.dto.game.GameEventDto;
import com.example.mobinogi.service.game.GameEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Game event lookup controller.
 */
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class GameEventController{

	/** Event service. */
	private final GameEventService gameEventService;

	/**
	 * Returns active events.
	 *
	 * @return active event list response
	 */
	@GetMapping
	public ResponseEntity<?> getActiveEvents(){
		try{
			List<GameEventDto> events = gameEventService.getActiveEvents();

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("data", events);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			return ResponseEntity.status(500).body(errorResponse);
		}
	}
}
