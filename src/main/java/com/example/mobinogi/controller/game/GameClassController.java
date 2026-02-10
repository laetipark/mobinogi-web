package com.example.mobinogi.controller.game;

import com.example.mobinogi.dto.game.GameClassDto;
import com.example.mobinogi.service.game.GameClassService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/classes")
@RequiredArgsConstructor
public class GameClassController{

	private final GameClassService gameClassService;

	@GetMapping
	public ResponseEntity<?> getClasses(){
		try{
			List<GameClassDto> classes = gameClassService.getAllClasses();

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("classes", classes);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			return ResponseEntity.status(500).body(errorResponse);
		}
	}
}
