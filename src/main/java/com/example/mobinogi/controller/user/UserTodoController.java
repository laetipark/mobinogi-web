package com.example.mobinogi.controller.user;

import com.example.mobinogi.dto.user.UserTodoBarterDto;
import com.example.mobinogi.dto.user.UserTodoDto;
import com.example.mobinogi.dto.user.UserTodoUpdateRequest;
import com.example.mobinogi.service.user.UserTodoBarterService;
import com.example.mobinogi.service.user.UserTodoService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user/todo")
@RequiredArgsConstructor
public class UserTodoController{

	private final UserTodoService userTodoService;
	private final UserTodoBarterService userTodoBarterService;
	private final JwtUtil jwtUtil;

	private Long getUserIdFromToken(String authHeader){
		if(authHeader == null || !authHeader.startsWith("Bearer ")){
			throw new RuntimeException("인증 토큰이 필요합니다.");
		}
		String token = authHeader.substring(7);
		if(!jwtUtil.validateToken(token)){
			throw new RuntimeException("유효하지 않은 토큰입니다.");
		}
		return jwtUtil.getUserIdFromToken(token);
	}

	@GetMapping
	public ResponseEntity<?> getMyTodos(@RequestHeader(value = "Authorization", required = false) String authHeader){
		try{
			Long userId = getUserIdFromToken(authHeader);
			List<UserTodoDto> todos = userTodoService.getTodosByUserId(userId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("todos", todos);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	@PutMapping("/{characterId}")
	public ResponseEntity<?> updateTodo(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long characterId,
		@RequestBody UserTodoUpdateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserTodoDto todo = userTodoService.updateTodo(userId, characterId, request);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "숙제가 업데이트되었습니다.");
			response.put("todo", todo);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	// ===== 물물교환 장바구니 엔드포인트 =====

	@GetMapping("/barter/{characterId}")
	public ResponseEntity<?> getBarterCart(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long characterId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			List<UserTodoBarterDto> cart = userTodoBarterService.getBarterCart(userId, characterId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("barters", cart);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	@PostMapping("/barter/{characterId}")
	public ResponseEntity<?> addBarterItem(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long characterId,
		@RequestBody Map<String, Object> body
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			Long barterId = ((Number) body.get("barterId")).longValue();
			String barterCycle = (String) body.get("barterCycle");

			UserTodoBarterDto barter = userTodoBarterService.addBarterItem(userId, characterId, barterId, barterCycle);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "물물교환 아이템이 추가되었습니다.");
			response.put("barter", barter);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	@DeleteMapping("/barter/{characterId}/{barterId}")
	public ResponseEntity<?> removeBarterItem(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long characterId,
		@PathVariable Long barterId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			userTodoBarterService.removeBarterItem(userId, barterId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("message", "물물교환 아이템이 제거되었습니다.");

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	@PutMapping("/barter/{characterId}/{barterId}/toggle")
	public ResponseEntity<?> toggleBarterComplete(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long characterId,
		@PathVariable Long barterId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			List<UserTodoBarterDto> barters = userTodoBarterService.toggleComplete(userId, characterId, barterId);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
			response.put("barters", barters);

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}
}
