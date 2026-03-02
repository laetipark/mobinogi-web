package com.example.mobinogi.todo.controller;

import com.example.mobinogi.todo.dto.UserTodoBarterDto;
import com.example.mobinogi.todo.dto.UserTodoDto;
import com.example.mobinogi.todo.dto.UserTodoUpdateRequest;
import com.example.mobinogi.todo.service.UserTodoBarterService;
import com.example.mobinogi.todo.service.UserTodoService;
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

	/** 사용자 TODO 관련 비즈니스 로직 서비스 */
	private final UserTodoService userTodoService;

	/** 물물교환 TODO 관련 비즈니스 로직 서비스 */
	private final UserTodoBarterService userTodoBarterService;

	/** 인증 토큰 검증 유틸 */
	private final JwtUtil jwtUtil;

	/**
	 * Authorization 헤더에서 사용자 ID를 추출합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @return 토큰에서 추출한 사용자 ID
	 */
	private Long getUserIdFromToken(String authHeader){
		if(authHeader == null || !authHeader.startsWith("Bearer ")){
			throw new RuntimeException("인증 토큰이 필요합니다.");
		}
		String token = authHeader.substring(7);
		if(!jwtUtil.validateToken(token)){
			throw new RuntimeException("유효하지 않은 또는 만료된 토큰입니다.");
		}
		return jwtUtil.getUserIdFromToken(token);
	}

	/**
	 * 로그인한 사용자의 TODO 목록을 조회합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @return TODO 목록 응답
	 */
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

	/**
	 * 특정 캐릭터의 TODO 데이터를 저장합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @param characterId 대상 캐릭터 ID
	 * @param request 저장할 TODO 데이터
	 * @return 저장 결과 응답
	 */
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
			response.put("message", "할 일 정보가 저장되었습니다.");
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

	// ===== 물물교환 장바구니 관리 API =====

	/**
	 * 물물교환 장바구니 목록을 조회합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @param characterId 대상 캐릭터 ID
	 * @return 장바구니 목록 응답
	 */
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

	/**
	 * 물물교환 장바구니 항목을 추가합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @param characterId 대상 캐릭터 ID
	 * @param body 항목 생성 요청 본문
	 * @return 생성 결과 응답
	 */
	@PostMapping("/barter/{characterId}")
	public ResponseEntity<?> addBarterItem(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long characterId,
		@RequestBody Map<String, Object> body
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			String itemName = (String) body.get("itemName");
			String exchangeItemName = (String) body.get("exchangeItemName");
			String npcName = (String) body.get("npcName");
			String regionName = (String) body.get("regionName");
			Integer exchangeCost = body.get("exchangeCost") != null ? ((Number) body.get("exchangeCost")).intValue() : null;
			String barterCycle = (String) body.get("barterCycle");

			if(itemName == null || exchangeItemName == null || npcName == null){
				throw new RuntimeException("아이템명, 교환 아이템명, NPC명은 필수입니다.");
			}

			UserTodoBarterDto barter = userTodoBarterService.addBarterItem(userId, characterId, itemName, exchangeItemName, npcName, regionName, exchangeCost, barterCycle);

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

	/**
	 * 물물교환 장바구니 항목을 삭제합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @param characterId 대상 캐릭터 ID
	 * @param barterId 삭제할 항목 ID
	 * @return 삭제 결과 응답
	 */
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
			response.put("message", "물물교환 아이템이 삭제되었습니다.");

			return ResponseEntity.ok(response);
		}catch(Exception e){
			Map<String, Object> errorResponse = new HashMap<>();
			errorResponse.put("success", false);
			errorResponse.put("message", e.getMessage());

			int status = e.getMessage() != null && e.getMessage().contains("토큰") ? 401 : 400;
			return ResponseEntity.status(status).body(errorResponse);
		}
	}

	/**
	 * 물물교환 장바구니 항목 완료 상태를 토글합니다.
	 *
	 * @param authHeader Authorization 헤더 값
	 * @param characterId 대상 캐릭터 ID
	 * @param barterId 대상 장바구니 ID
	 * @param body 완료 수량(optional) 요청 본문
	 * @return 갱신된 항목 응답
	 */
	@PutMapping("/barter/{characterId}/{barterId}/toggle")
	public ResponseEntity<?> toggleBarterComplete(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long characterId,
		@PathVariable Long barterId,
		@RequestBody(required = false) Map<String, Object> body
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			Integer completedCount = null;
			if(body != null && body.get("completedCount") instanceof Number number){
				completedCount = number.intValue();
			}
			UserTodoBarterDto barter = userTodoBarterService.toggleComplete(userId, characterId, barterId, completedCount);

			Map<String, Object> response = new HashMap<>();
			response.put("success", true);
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
}


