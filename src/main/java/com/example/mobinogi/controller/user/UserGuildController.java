package com.example.mobinogi.controller.user;

import com.example.mobinogi.dto.user.UserGuildDto;
import com.example.mobinogi.entity.UserGuild;
import com.example.mobinogi.service.user.UserGuildService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/guild/members")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class UserGuildController {

	private final UserGuildService userGuildService;

	/**
	 * 길드원 목록 조회 (페이징)
	 */
	@GetMapping("/")
	public Page<UserGuildDto> getAllUserGuilds(
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "20") int size,
		@RequestParam(defaultValue = "memberName") String sortBy,
		@RequestParam(defaultValue = "asc") String sortDir) {

		log.info("길드원 목록 조회 요청 - page: {}, size: {}, sortBy: {}, sortDir: {}", page, size, sortBy, sortDir);

		// 프론트엔드 필드명을 백엔드 필드명으로 변환
		String mappedSortBy = mapSortField(sortBy);

		Page<UserGuild> result = userGuildService.getAllUserGuilds(page, size, mappedSortBy, sortDir);
		return result.map(UserGuildDto::from);
	}

	/**
	 * 멤버명으로 검색
	 */
	@GetMapping("/search")
	public List<UserGuildDto> searchByMemberName(@RequestParam String memberName) {
		log.info("멤버명으로 검색 요청 - memberName: {}", memberName);
		return userGuildService.searchByMemberName(memberName).stream()
			.map(UserGuildDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 정확한 멤버명으로 조회
	 */
	@GetMapping("/member/{memberName}")
	public ResponseEntity<UserGuildDto> getByMemberName(@PathVariable String memberName) {
		log.info("정확한 멤버명으로 조회 요청 - memberName: {}", memberName);
		return userGuildService.getByExactMemberName(memberName)
			.map(UserGuildDto::from)
			.map(ResponseEntity::ok)
			.orElse(ResponseEntity.notFound().build());
	}

	/**
	 * 직업별 조회
	 */
	@GetMapping("/job/{jobClass}")
	public List<UserGuildDto> getByJobClass(@PathVariable String jobClass) {
		log.info("직업별 조회 요청 - jobClass: {}", jobClass);
		return userGuildService.getByClassName(jobClass).stream()
			.map(UserGuildDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 계열별 조회
	 */
	@GetMapping("/category/{category}")
	public List<UserGuildDto> getByCategory(@PathVariable String category) {
		log.info("계열별 조회 요청 - category: {}", category);
		return userGuildService.getByClassType(category).stream()
			.map(UserGuildDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 기여도 시작 랭킹
	 */
	@GetMapping("/ranking/contribution-start")
	public List<UserGuildDto> getTopContributionStartRanking(@RequestParam(defaultValue = "10") int limit) {
		log.info("기여도 시작 랭킹 조회 요청 - limit: {}", limit);
		return userGuildService.getTopContributionStartRanking(limit).stream()
			.map(UserGuildDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 기여도 마무리 랭킹
	 */
	@GetMapping("/ranking/contribution-finish")
	public List<UserGuildDto> getTopContributionFinishRanking(@RequestParam(defaultValue = "10") int limit) {
		log.info("기여도 마무리 랭킹 조회 요청 - limit: {}", limit);
		return userGuildService.getTopContributionFinishRanking(limit).stream()
			.map(UserGuildDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 변화량 랭킹
	 */
	@GetMapping("/ranking/contribution-changed")
	public List<UserGuildDto> getTopContributionChangedRanking(@RequestParam(defaultValue = "10") int limit) {
		log.info("변화량 랭킹 조회 요청 - limit: {}", limit);
		return userGuildService.getTopContributionChangedRanking(limit).stream()
			.map(UserGuildDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 기여도 범위 조회
	 */
	@GetMapping("/contribution-range")
	public List<UserGuildDto> getByContributionRange(
		@RequestParam Integer minContribution,
		@RequestParam Integer maxContribution) {
		log.info("기여도 범위 조회 요청 - min: {}, max: {}", minContribution, maxContribution);
		return userGuildService.getByContributionRange(minContribution, maxContribution).stream()
			.map(UserGuildDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 통계 정보 조회
	 */
	@GetMapping("/stats")
	public ResponseEntity<?> getStats() {
		log.info("통계 정보 조회 요청");
		long totalCount = userGuildService.getTotalMemberCount();
		return ResponseEntity.ok(java.util.Map.of(
			"totalMembers", totalCount,
			"lastSyncTime", userGuildService.getLastSyncTime()
		));
	}

	/**
	 * 프론트엔드 필드명을 백엔드 필드명으로 매핑
	 */
	private String mapSortField(String frontendField) {
		return switch (frontendField) {
			case "jobClass" -> "className";
			case "category" -> "classType";
			default -> frontendField;
		};
	}
}
