package com.example.mobinogi.controller.user;

import com.example.mobinogi.dto.user.*;
import com.example.mobinogi.service.user.GuildManagementService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/guild/management")
@RequiredArgsConstructor
public class GuildManagementController{

	private final GuildManagementService guildManagementService;
	private final JwtUtil jwtUtil;

	@GetMapping("/dashboard")
	public ResponseEntity<?> getDashboard(@RequestHeader(value = "Authorization", required = false) String authHeader){
		try{
			Long userId = getUserIdFromToken(authHeader);
			GuildDashboardDto dashboard = guildManagementService.getDashboard(userId);
			return ResponseEntity.ok(success("dashboard", dashboard));
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	@PostMapping("/register")
	public ResponseEntity<?> registerGuild(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody GuildRegisterRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildDto created = guildManagementService.registerGuild(userId, request);
			Map<String, Object> response = success("guild", created);
			response.put("message", "길드 등록 신청이 완료되었습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	@PutMapping("/guild/description")
	public ResponseEntity<?> updateGuildDescription(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody GuildDescriptionUpdateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildDto updated = guildManagementService.updateGuildDescription(userId, request.getDescription());
			Map<String, Object> response = success("guild", updated);
			response.put("message", "길드 소개를 수정했습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	@PostMapping("/join")
	public ResponseEntity<?> requestJoinGuild(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody GuildJoinRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildMemberDto created = guildManagementService.requestJoinGuild(userId, request);
			Map<String, Object> response = success("member", created);
			response.put("message", "길드 가입 요청이 등록되었습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	@PostMapping("/members/{memberId}/approve")
	public ResponseEntity<?> approveMember(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long memberId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildMemberDto updated = guildManagementService.approveMember(userId, memberId);
			Map<String, Object> response = success("member", updated);
			response.put("message", "길드원을 승인했습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	@PostMapping("/members/{memberId}/reject")
	public ResponseEntity<?> rejectMember(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long memberId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildMemberDto updated = guildManagementService.rejectMember(userId, memberId);
			Map<String, Object> response = success("member", updated);
			response.put("message", "길드 가입 요청을 반려했습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	@PutMapping("/members/{memberId}/role")
	public ResponseEntity<?> updateMemberRole(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long memberId,
		@RequestBody GuildRoleUpdateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildMemberDto updated = guildManagementService.updateMemberRole(userId, memberId, request.getGuildRole());
			Map<String, Object> response = success("member", updated);
			response.put("message", "길드 역할을 변경했습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	@PostMapping("/members")
	public ResponseEntity<?> createMember(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody GuildMemberManageRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildMemberDto created = guildManagementService.createMember(userId, request);
			Map<String, Object> response = success("member", created);
			response.put("message", "길드원 정보를 추가했습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	@PutMapping("/members/{memberId}")
	public ResponseEntity<?> updateMemberInfo(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long memberId,
		@RequestBody GuildMemberManageRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildMemberDto updated = guildManagementService.updateMemberInfo(userId, memberId, request);
			Map<String, Object> response = success("member", updated);
			response.put("message", "길드원 정보를 수정했습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	@DeleteMapping("/members/{memberId}")
	public ResponseEntity<?> deleteMember(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long memberId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			guildManagementService.deleteMember(userId, memberId);
			Map<String, Object> response = success("memberId", memberId);
			response.put("message", "길드원 정보를 삭제했습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	@PostMapping("/members/refresh-ranks")
	public ResponseEntity<?> refreshMemberRanks(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody(required = false) GuildMemberRankRefreshRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			GuildMemberRankRefreshSummaryDto summary = guildManagementService.refreshMemberRanks(
				userId,
				request != null ? request.getMembers() : null
			);
			Map<String, Object> response = success("summary", summary);
			response.put("message", "길드원 정보 갱신 요청을 완료했습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	@GetMapping("/members/refresh-ranks/status")
	public ResponseEntity<?> getRefreshMemberRanksStatus(
		@RequestHeader(value = "Authorization", required = false) String authHeader
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			GuildMemberRankRefreshStatusDto status = guildManagementService.getMemberRankRefreshStatus(userId);
			return ResponseEntity.ok(success("status", status));
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	@PostMapping("/admin/guilds/{guildId}/approve")
	public ResponseEntity<?> approveGuild(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long guildId,
		@RequestBody(required = false) GuildReviewRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			String reviewNote = request != null ? request.getReviewNote() : null;
			UserGuildDto updated = guildManagementService.approveGuild(userId, guildId, reviewNote);
			Map<String, Object> response = success("guild", updated);
			response.put("message", "길드 등록 요청을 승인했습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	@PostMapping("/admin/guilds/{guildId}/reject")
	public ResponseEntity<?> rejectGuild(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long guildId,
		@RequestBody(required = false) GuildReviewRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			String reviewNote = request != null ? request.getReviewNote() : null;
			UserGuildDto updated = guildManagementService.rejectGuild(userId, guildId, reviewNote);
			Map<String, Object> response = success("guild", updated);
			response.put("message", "길드 등록 요청을 반려했습니다.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

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

	private Map<String, Object> success(String key, Object value){
		Map<String, Object> response = new HashMap<>();
		response.put("success", true);
		response.put(key, value);
		return response;
	}

	private Map<String, Object> failure(String message){
		Map<String, Object> response = new HashMap<>();
		response.put("success", false);
		response.put("message", message);
		return response;
	}
}
