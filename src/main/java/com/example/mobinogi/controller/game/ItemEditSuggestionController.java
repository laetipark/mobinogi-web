package com.example.mobinogi.controller.game;

import com.example.mobinogi.dto.game.ItemEditSuggestionCreateRequest;
import com.example.mobinogi.dto.game.ItemEditSuggestionDto;
import com.example.mobinogi.dto.game.ItemEditSuggestionReviewRequest;
import com.example.mobinogi.service.game.ItemEditSuggestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/item-edit-reports")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@RequiredArgsConstructor
public class ItemEditSuggestionController{

	private final ItemEditSuggestionService itemEditSuggestionService;

	@PostMapping
	public ResponseEntity<?> createSuggestion(
		@RequestBody ItemEditSuggestionCreateRequest request,
		Authentication authentication
	){
		try{
			Long userId = requireUserId(authentication);
			ItemEditSuggestionDto dto = itemEditSuggestionService.createSuggestion(userId, request);
			return ResponseEntity.ok(Map.of("success", true, "report", dto));
		}catch(Exception e){
			return errorResponse(e);
		}
	}

	@GetMapping("/items/{itemName}")
	public ResponseEntity<?> getItemSuggestions(
		@PathVariable String itemName,
		@RequestParam(required = false) String status,
		Authentication authentication
	){
		try{
			Long userId = requireUserId(authentication);
			List<ItemEditSuggestionDto> reports = itemEditSuggestionService.getItemSuggestions(itemName, status, userId);
			return ResponseEntity.ok(Map.of("success", true, "reports", reports));
		}catch(Exception e){
			return errorResponse(e);
		}
	}

	@GetMapping("/pending")
	public ResponseEntity<?> getPendingSuggestions(Authentication authentication){
		try{
			Long userId = requireUserId(authentication);
			List<ItemEditSuggestionDto> reports = itemEditSuggestionService.getPendingSuggestions(userId);
			return ResponseEntity.ok(Map.of("success", true, "reports", reports));
		}catch(Exception e){
			return errorResponse(e);
		}
	}

	@PostMapping("/{suggestionId}/approve")
	public ResponseEntity<?> approveSuggestion(
		@PathVariable Long suggestionId,
		@RequestBody(required = false) ItemEditSuggestionReviewRequest request,
		Authentication authentication
	){
		try{
			Long userId = requireUserId(authentication);
			String reviewNote = request == null ? null : request.getReviewNote();
			String suggestedValue = request == null ? null : request.getSuggestedValue();
			ItemEditSuggestionDto dto = itemEditSuggestionService.approveSuggestion(suggestionId, userId, reviewNote, suggestedValue);
			return ResponseEntity.ok(Map.of("success", true, "report", dto));
		}catch(Exception e){
			return errorResponse(e);
		}
	}

	@PostMapping("/{suggestionId}/reject")
	public ResponseEntity<?> rejectSuggestion(
		@PathVariable Long suggestionId,
		@RequestBody(required = false) ItemEditSuggestionReviewRequest request,
		Authentication authentication
	){
		try{
			Long userId = requireUserId(authentication);
			String reviewNote = request == null ? null : request.getReviewNote();
			ItemEditSuggestionDto dto = itemEditSuggestionService.rejectSuggestion(suggestionId, userId, reviewNote);
			return ResponseEntity.ok(Map.of("success", true, "report", dto));
		}catch(Exception e){
			return errorResponse(e);
		}
	}

	private Long requireUserId(Authentication authentication){
		if(authentication == null || authentication.getPrincipal() == null){
			throw new SecurityException("Authentication required");
		}

		Object principal = authentication.getPrincipal();
		if(principal instanceof Long longValue){
			return longValue;
		}
		if(principal instanceof Number number){
			return number.longValue();
		}
		if(principal instanceof String stringValue){
			try{
				return Long.parseLong(stringValue);
			}catch(NumberFormatException e){
				throw new SecurityException("Invalid authentication principal");
			}
		}
		throw new SecurityException("Unsupported authentication principal");
	}

	private ResponseEntity<Map<String, Object>> errorResponse(Exception e){
		Map<String, Object> body = new HashMap<>();
		body.put("success", false);
		body.put("message", e.getMessage());

		int status = 400;
		if(e instanceof SecurityException){
			String message = e.getMessage() == null ? "" : e.getMessage().toLowerCase();
			status = message.contains("admin") ? 403 : 401;
		}else if(e instanceof IllegalStateException){
			status = 409;
		}
		return ResponseEntity.status(status).body(body);
	}
}
