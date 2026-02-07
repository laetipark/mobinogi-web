package com.example.mobinogi.controller.game;

import com.example.mobinogi.dto.game.GameMonsterDto;
import com.example.mobinogi.service.game.GameMonsterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/monsters")
@RequiredArgsConstructor
public class GameMonsterController{

	private final GameMonsterService gameMonsterService;

	@GetMapping
	public ResponseEntity<?> getMonsters(@RequestParam(required = false) String type){
		try{
			List<GameMonsterDto> monsters;
			if(type != null && !type.isEmpty()){
				monsters = gameMonsterService.getMonstersByType(type);
			}else{
				monsters = gameMonsterService.getAllMonsters();
			}

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("monsters", monsters);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			return ResponseEntity.status(500).body(errorResponse);
		}
	}
}
