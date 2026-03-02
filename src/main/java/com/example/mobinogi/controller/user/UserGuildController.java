package com.example.mobinogi.controller.user;

import com.example.mobinogi.dto.user.UserGuildMemberListDto;
import com.example.mobinogi.entity.guild.UserGuildMember;
import com.example.mobinogi.service.user.UserGuildService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 길드 멤버 조회 전용 API 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/guild/members")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class UserGuildController{

	/** 길드 멤버 조회 서비스 */
	private final UserGuildService userGuildService;

	/**
	 * 길드 멤버 목록을 페이지 단위로 조회합니다.
	 *
	 * @param page 페이지 번호(0-based)
	 * @param size 페이지 크기
	 * @param sortBy 정렬 필드
	 * @param sortDir 정렬 방향
	 * @return 페이지 응답
	 */
	@GetMapping("/")
	public Page<UserGuildMemberListDto> getAllUserGuilds(
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "20") int size,
		@RequestParam(defaultValue = "memberName") String sortBy,
		@RequestParam(defaultValue = "asc") String sortDir
	){
		log.info("길드원 목록 조회 요청 - page: {}, size: {}, sortBy: {}, sortDir: {}", page, size, sortBy, sortDir);

		// 프론트 필드명을 백엔드 정렬 필드명으로 매핑합니다.
		String mappedSortBy = mapSortField(sortBy);

		Page<UserGuildMember> result = userGuildService.getAllUserGuilds(page, size, mappedSortBy, sortDir);
		return result.map(UserGuildMemberListDto::from);
	}

	/**
	 * 멤버명 키워드로 멤버 목록을 조회합니다.
	 *
	 * @param memberName 멤버명 키워드
	 * @return 조회 결과 목록
	 */
	@GetMapping("/search")
	public List<UserGuildMemberListDto> searchByMemberName(@RequestParam String memberName){
		log.info("멤버명 검색 요청 - memberName: {}", memberName);
		return userGuildService.searchByMemberName(memberName).stream()
			.map(UserGuildMemberListDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 멤버명을 정확히 일치시켜 단건을 조회합니다.
	 *
	 * @param memberName 멤버명
	 * @return 단건 조회 응답
	 */
	@GetMapping("/member/{memberName}")
	public ResponseEntity<UserGuildMemberListDto> getByMemberName(@PathVariable String memberName){
		log.info("멤버명 정확 조회 요청 - memberName: {}", memberName);
		return userGuildService.getByExactMemberName(memberName)
			.map(UserGuildMemberListDto::from)
			.map(ResponseEntity::ok)
			.orElse(ResponseEntity.notFound().build());
	}

	/**
	 * 직업명으로 멤버를 조회합니다.
	 *
	 * @param jobClass 직업명
	 * @return 조회 결과 목록
	 */
	@GetMapping("/job/{jobClass}")
	public List<UserGuildMemberListDto> getByJobClass(@PathVariable String jobClass){
		log.info("직업별 조회 요청 - jobClass: {}", jobClass);
		return userGuildService.getByClassName(jobClass).stream()
			.map(UserGuildMemberListDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 직업 계열로 멤버를 조회합니다.
	 *
	 * @param category 직업 계열
	 * @return 조회 결과 목록
	 */
	@GetMapping("/category/{category}")
	public List<UserGuildMemberListDto> getByCategory(@PathVariable String category){
		log.info("계열별 조회 요청 - category: {}", category);
		return userGuildService.getByClassType(category).stream()
			.map(UserGuildMemberListDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 기여도 시작값 상위 랭킹을 조회합니다.
	 *
	 * @param limit 조회 개수
	 * @return 랭킹 목록
	 */
	@GetMapping("/ranking/contribution-start")
	public List<UserGuildMemberListDto> getTopContributionStartRanking(@RequestParam(defaultValue = "10") int limit){
		log.info("기여도 시작값 랭킹 조회 요청 - limit: {}", limit);
		return userGuildService.getTopContributionStartRanking(limit).stream()
			.map(UserGuildMemberListDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 기여도 종료값 상위 랭킹을 조회합니다.
	 *
	 * @param limit 조회 개수
	 * @return 랭킹 목록
	 */
	@GetMapping("/ranking/contribution-finish")
	public List<UserGuildMemberListDto> getTopContributionFinishRanking(@RequestParam(defaultValue = "10") int limit){
		log.info("기여도 마감값 랭킹 조회 요청 - limit: {}", limit);
		return userGuildService.getTopContributionFinishRanking(limit).stream()
			.map(UserGuildMemberListDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 기여도 변화량 상위 랭킹을 조회합니다.
	 *
	 * @param limit 조회 개수
	 * @return 랭킹 목록
	 */
	@GetMapping("/ranking/contribution-changed")
	public List<UserGuildMemberListDto> getTopContributionChangedRanking(@RequestParam(defaultValue = "10") int limit){
		log.info("기여도 변화량 랭킹 조회 요청 - limit: {}", limit);
		return userGuildService.getTopContributionChangedRanking(limit).stream()
			.map(UserGuildMemberListDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 기여도 범위로 멤버를 조회합니다.
	 *
	 * @param minContribution 최소 기여도
	 * @param maxContribution 최대 기여도
	 * @return 조회 결과 목록
	 */
	@GetMapping("/contribution-range")
	public List<UserGuildMemberListDto> getByContributionRange(
		@RequestParam Integer minContribution,
		@RequestParam Integer maxContribution
	){
		log.info("기여도 범위 조회 요청 - min: {}, max: {}", minContribution, maxContribution);
		return userGuildService.getByContributionRange(minContribution, maxContribution).stream()
			.map(UserGuildMemberListDto::from)
			.collect(Collectors.toList());
	}

	/**
	 * 길드 멤버 통계 정보를 조회합니다.
	 *
	 * @return 통계 응답
	 */
	@GetMapping("/stats")
	public ResponseEntity<?> getStats(){
		log.info("길드 멤버 통계 조회 요청");
		long totalCount = userGuildService.getTotalMemberCount();
		return ResponseEntity.ok(java.util.Map.of(
			"totalMembers", totalCount,
			"lastSyncTime", userGuildService.getLastSyncTime()
		));
	}

	/**
	 * 프론트 정렬 필드를 백엔드 엔티티 필드로 매핑합니다.
	 *
	 * @param frontendField 프론트 정렬 필드
	 * @return 백엔드 정렬 필드
	 */
	private String mapSortField(String frontendField){
		return switch(frontendField){
			case "jobClass" -> "className";
			case "category" -> "classType";
			default -> frontendField;
		};
	}
}
