package com.example.mobinogi.controller.user;

import com.example.mobinogi.dto.user.GuildBoardCategoryCreateRequest;
import com.example.mobinogi.dto.user.GuildBoardCategoryDto;
import com.example.mobinogi.dto.user.GuildBoardPostCreateRequest;
import com.example.mobinogi.dto.user.GuildBoardPostDto;
import com.example.mobinogi.dto.user.GuildDashboardDto;
import com.example.mobinogi.dto.user.GuildDescriptionUpdateRequest;
import com.example.mobinogi.dto.user.GuildGalleryImageCreateRequest;
import com.example.mobinogi.dto.user.GuildGalleryImageDto;
import com.example.mobinogi.dto.user.GuildJoinRequest;
import com.example.mobinogi.dto.user.GuildLevelUpdateRequest;
import com.example.mobinogi.dto.user.GuildMemberManageRequest;
import com.example.mobinogi.dto.user.GuildMemberRankRefreshRequest;
import com.example.mobinogi.dto.user.GuildMemberRankRefreshStatusDto;
import com.example.mobinogi.dto.user.GuildMemberRankRefreshSummaryDto;
import com.example.mobinogi.dto.user.GuildRegisterRequest;
import com.example.mobinogi.dto.user.GuildReviewRequest;
import com.example.mobinogi.dto.user.GuildRoleUpdateRequest;
import com.example.mobinogi.dto.user.UserGuildDto;
import com.example.mobinogi.dto.user.UserGuildMemberDto;
import com.example.mobinogi.service.user.GuildManagementService;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for guild management APIs.
 */
@RestController
@RequestMapping("/api/guild/management")
@RequiredArgsConstructor
public class GuildManagementController{

	/** Guild management service layer. */
	private final GuildManagementService guildManagementService;

	/** JWT utility for token validation and parsing. */
	private final JwtUtil jwtUtil;

	/**
	 * Returns guild dashboard data.
	 *
	 * @param authHeader authorization header
	 * @return dashboard payload
	 */
	@GetMapping("/dashboard")
	public ResponseEntity<?> getDashboard(@RequestHeader(value = "Authorization", required = false) String authHeader){
		try{
			Long userId = getOptionalUserIdFromToken(authHeader);
			GuildDashboardDto dashboard = guildManagementService.getDashboard(userId);
			return ResponseEntity.ok(success("dashboard", dashboard));
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Returns guild gallery list.
	 *
	 * @param guildId guild id
	 * @param limit optional max count
	 * @return gallery payload
	 */
	@GetMapping("/guilds/{guildId}/gallery")
	public ResponseEntity<?> getGuildGallery(
		@PathVariable Long guildId,
		@RequestParam(value = "limit", required = false) Integer limit
	){
		try{
			return ResponseEntity.ok(success("gallery", guildManagementService.getGuildGallery(guildId, limit)));
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Creates a guild gallery image item.
	 *
	 * @param authHeader authorization header
	 * @param guildId guild id
	 * @param request create request body
	 * @return created image payload
	 */
	@PostMapping("/guilds/{guildId}/gallery")
	public ResponseEntity<?> createGuildGalleryImage(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long guildId,
		@RequestBody GuildGalleryImageCreateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			GuildGalleryImageDto created = guildManagementService.createGuildGalleryImage(userId, guildId, request);
			Map<String, Object> response = success("image", created);
			response.put("message", "Guild gallery image created.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Deletes a guild gallery image item.
	 *
	 * @param authHeader authorization header
	 * @param guildId guild id
	 * @param imageId image id
	 * @return deletion result
	 */
	@DeleteMapping("/guilds/{guildId}/gallery/{imageId}")
	public ResponseEntity<?> deleteGuildGalleryImage(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long guildId,
		@PathVariable Long imageId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			guildManagementService.deleteGuildGalleryImage(userId, guildId, imageId);
			Map<String, Object> response = success("imageId", imageId);
			response.put("message", "Guild gallery image deleted.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Updates a guild gallery image item.
	 *
	 * @param authHeader authorization header
	 * @param guildId guild id
	 * @param imageId image id
	 * @param request update request body
	 * @return updated image payload
	 */
	@PutMapping("/guilds/{guildId}/gallery/{imageId}")
	public ResponseEntity<?> updateGuildGalleryImage(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long guildId,
		@PathVariable Long imageId,
		@RequestBody GuildGalleryImageCreateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			GuildGalleryImageDto updated = guildManagementService.updateGuildGalleryImage(userId, guildId, imageId, request);
			Map<String, Object> response = success("image", updated);
			response.put("message", "Guild gallery image updated.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Toggles like state for a guild gallery image.
	 *
	 * @param authHeader authorization header
	 * @param guildId guild id
	 * @param imageId image id
	 * @return updated image payload
	 */
	@PostMapping("/guilds/{guildId}/gallery/{imageId}/like")
	public ResponseEntity<?> toggleGuildGalleryImageLike(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long guildId,
		@PathVariable Long imageId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			GuildGalleryImageDto updated = guildManagementService.toggleGuildGalleryImageLike(userId, guildId, imageId);
			Map<String, Object> response = success("image", updated);
			response.put("message", "Guild gallery image like toggled.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Returns guild board post list.
	 *
	 * @param guildId guild id
	 * @param limit optional max count
	 * @return post list payload
	 */
	@GetMapping("/guilds/{guildId}/board")
	public ResponseEntity<?> getGuildBoardPosts(
		@PathVariable Long guildId,
		@RequestParam(value = "limit", required = false) Integer limit
	){
		try{
			return ResponseEntity.ok(success("posts", guildManagementService.getGuildBoardPosts(guildId, limit)));
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Returns guild board category list.
	 *
	 * @param guildId guild id
	 * @return category list payload
	 */
	@GetMapping("/guilds/{guildId}/board/categories")
	public ResponseEntity<?> getGuildBoardCategories(@PathVariable Long guildId){
		try{
			return ResponseEntity.ok(success("categories", guildManagementService.getGuildBoardCategories(guildId)));
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Creates a guild board category.
	 *
	 * @param authHeader authorization header
	 * @param guildId guild id
	 * @param request create request body
	 * @return created category payload
	 */
	@PostMapping("/guilds/{guildId}/board/categories")
	public ResponseEntity<?> createGuildBoardCategory(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long guildId,
		@RequestBody GuildBoardCategoryCreateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			GuildBoardCategoryDto created = guildManagementService.createGuildBoardCategory(userId, guildId, request);
			Map<String, Object> response = success("category", created);
			response.put("message", "Guild board category created.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Deletes a guild board category.
	 *
	 * @param authHeader authorization header
	 * @param guildId guild id
	 * @param categoryId category id
	 * @return deletion result
	 */
	@DeleteMapping("/guilds/{guildId}/board/categories/{categoryId}")
	public ResponseEntity<?> deleteGuildBoardCategory(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long guildId,
		@PathVariable Long categoryId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			guildManagementService.deleteGuildBoardCategory(userId, guildId, categoryId);
			Map<String, Object> response = success("categoryId", categoryId);
			response.put("message", "Guild board category deleted.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Creates a guild board post.
	 *
	 * @param authHeader authorization header
	 * @param guildId guild id
	 * @param request create request body
	 * @return created post payload
	 */
	@PostMapping("/guilds/{guildId}/board")
	public ResponseEntity<?> createGuildBoardPost(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long guildId,
		@RequestBody GuildBoardPostCreateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			GuildBoardPostDto created = guildManagementService.createGuildBoardPost(userId, guildId, request);
			Map<String, Object> response = success("post", created);
			response.put("message", "Guild board post created.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Deletes a guild board post.
	 *
	 * @param authHeader authorization header
	 * @param guildId guild id
	 * @param postId post id
	 * @return deletion result
	 */
	@DeleteMapping("/guilds/{guildId}/board/{postId}")
	public ResponseEntity<?> deleteGuildBoardPost(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long guildId,
		@PathVariable Long postId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			guildManagementService.deleteGuildBoardPost(userId, guildId, postId);
			Map<String, Object> response = success("postId", postId);
			response.put("message", "Guild board post deleted.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Registers a guild.
	 *
	 * @param authHeader authorization header
	 * @param request register request body
	 * @return created guild payload
	 */
	@PostMapping("/register")
	public ResponseEntity<?> registerGuild(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody GuildRegisterRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildDto created = guildManagementService.registerGuild(userId, request);
			Map<String, Object> response = success("guild", created);
			response.put("message", "Guild registration request completed.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Updates guild description.
	 *
	 * @param authHeader authorization header
	 * @param request description update request
	 * @return updated guild payload
	 */
	@PutMapping("/guild/description")
	public ResponseEntity<?> updateGuildDescription(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody GuildDescriptionUpdateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildDto updated = guildManagementService.updateGuildDescription(userId, request.getDescription());
			Map<String, Object> response = success("guild", updated);
			response.put("message", "Guild description updated.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Requests guild membership.
	 *
	 * @param authHeader authorization header
	 * @param request join request body
	 * @return created membership payload
	 */
	@PostMapping("/join")
	public ResponseEntity<?> requestJoinGuild(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody GuildJoinRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildMemberDto created = guildManagementService.requestJoinGuild(userId, request);
			Map<String, Object> response = success("member", created);
			response.put("message", "Guild join request submitted.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Approves a pending member.
	 *
	 * @param authHeader authorization header
	 * @param memberId member id
	 * @return updated member payload
	 */
	@PostMapping("/members/{memberId}/approve")
	public ResponseEntity<?> approveMember(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long memberId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildMemberDto updated = guildManagementService.approveMember(userId, memberId);
			Map<String, Object> response = success("member", updated);
			response.put("message", "Guild member approved.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Rejects a pending member.
	 *
	 * @param authHeader authorization header
	 * @param memberId member id
	 * @return updated member payload
	 */
	@PostMapping("/members/{memberId}/reject")
	public ResponseEntity<?> rejectMember(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long memberId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildMemberDto updated = guildManagementService.rejectMember(userId, memberId);
			Map<String, Object> response = success("member", updated);
			response.put("message", "Guild member request rejected.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Updates member role.
	 *
	 * @param authHeader authorization header
	 * @param memberId member id
	 * @param request role update request
	 * @return updated member payload
	 */
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
			response.put("message", "Guild member role updated.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Creates a member record manually.
	 *
	 * @param authHeader authorization header
	 * @param request member management request
	 * @return created member payload
	 */
	@PostMapping("/members")
	public ResponseEntity<?> createMember(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@RequestBody GuildMemberManageRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildMemberDto created = guildManagementService.createMember(userId, request);
			Map<String, Object> response = success("member", created);
			response.put("message", "Guild member created.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Updates member profile information.
	 *
	 * @param authHeader authorization header
	 * @param memberId member id
	 * @param request member management request
	 * @return updated member payload
	 */
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
			response.put("message", "Guild member information updated.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Deletes a member.
	 *
	 * @param authHeader authorization header
	 * @param memberId member id
	 * @return deletion result
	 */
	@DeleteMapping("/members/{memberId}")
	public ResponseEntity<?> deleteMember(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long memberId
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			guildManagementService.deleteMember(userId, memberId);
			Map<String, Object> response = success("memberId", memberId);
			response.put("message", "Guild member deleted.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Starts member rank refresh.
	 *
	 * @param authHeader authorization header
	 * @param request optional refresh target request
	 * @return refresh summary payload
	 */
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
			response.put("message", "Guild member rank refresh requested.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Returns status of the latest member rank refresh.
	 *
	 * @param authHeader authorization header
	 * @return refresh status payload
	 */
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

	/**
	 * Approves guild registration as an admin.
	 *
	 * @param authHeader authorization header
	 * @param guildId guild id
	 * @param request optional review request
	 * @return updated guild payload
	 */
	@PostMapping("/admin/guilds/{guildId}/approve")
	public ResponseEntity<?> approveGuild(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long guildId,
		@RequestBody(required = false) GuildReviewRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			String reviewNote = request != null ? request.getReviewNote() : null;
			Integer level = request != null ? request.getLevel() : null;
			UserGuildDto updated = guildManagementService.approveGuild(userId, guildId, reviewNote, level);
			Map<String, Object> response = success("guild", updated);
			response.put("message", "Guild registration approved.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Rejects guild registration as an admin.
	 *
	 * @param authHeader authorization header
	 * @param guildId guild id
	 * @param request optional review request
	 * @return updated guild payload
	 */
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
			response.put("message", "Guild registration rejected.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Updates guild level as an admin.
	 *
	 * @param authHeader authorization header
	 * @param guildId guild id
	 * @param request level update request
	 * @return updated guild payload
	 */
	@PutMapping("/admin/guilds/{guildId}/level")
	public ResponseEntity<?> updateGuildLevel(
		@RequestHeader(value = "Authorization", required = false) String authHeader,
		@PathVariable Long guildId,
		@RequestBody GuildLevelUpdateRequest request
	){
		try{
			Long userId = getUserIdFromToken(authHeader);
			UserGuildDto updated = guildManagementService.updateGuildLevel(userId, guildId, request.getLevel());
			Map<String, Object> response = success("guild", updated);
			response.put("message", "Guild level updated.");
			return ResponseEntity.ok(response);
		}catch(Exception e){
			return ResponseEntity.badRequest().body(failure(e.getMessage()));
		}
	}

	/**
	 * Extracts user id from token if header exists.
	 *
	 * @param authHeader authorization header
	 * @return user id or null
	 */
	private Long getOptionalUserIdFromToken(String authHeader){
		if(authHeader == null || authHeader.isBlank()){
			return null;
		}
		return getUserIdFromToken(authHeader);
	}

	/**
	 * Extracts user id from bearer token header.
	 *
	 * @param authHeader authorization header
	 * @return user id
	 */
	private Long getUserIdFromToken(String authHeader){
		if(authHeader == null || !authHeader.startsWith("Bearer ")){
			throw new RuntimeException("Authentication token is required.");
		}
		String token = authHeader.substring(7);
		if(!jwtUtil.validateToken(token)){
			throw new RuntimeException("Token is invalid or expired.");
		}
		return jwtUtil.getUserIdFromToken(token);
	}

	/**
	 * Builds success response map.
	 *
	 * @param key payload key
	 * @param value payload value
	 * @return success response map
	 */
	private Map<String, Object> success(String key, Object value){
		Map<String, Object> response = new HashMap<>();
		response.put("success", true);
		response.put(key, value);
		return response;
	}

	/**
	 * Builds failure response map.
	 *
	 * @param message failure message
	 * @return failure response map
	 */
	private Map<String, Object> failure(String message){
		Map<String, Object> response = new HashMap<>();
		response.put("success", false);
		response.put("message", message);
		return response;
	}
}
