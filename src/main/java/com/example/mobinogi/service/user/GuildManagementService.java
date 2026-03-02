package com.example.mobinogi.service.user;

import com.example.mobinogi.dto.user.*;
import com.example.mobinogi.entity.guild.UserGuildBoardCategory;
import com.example.mobinogi.entity.guild.UserGuildBoardPost;
import com.example.mobinogi.entity.guild.UserGuildGalleryImage;
import com.example.mobinogi.entity.guild.UserGuildGalleryLike;
import com.example.mobinogi.entity.user.User;
import com.example.mobinogi.entity.guild.UserGuild;
import com.example.mobinogi.entity.guild.UserGuildMember;
import com.example.mobinogi.entity.user.UserRank;
import com.example.mobinogi.repository.GuildBoardCategoryRepository;
import com.example.mobinogi.repository.GuildBoardPostRepository;
import com.example.mobinogi.repository.GuildGalleryImageRepository;
import com.example.mobinogi.repository.GuildGalleryLikeRepository;
import com.example.mobinogi.repository.GuildRepository;
import com.example.mobinogi.repository.UserGuildRepository;
import com.example.mobinogi.repository.UserRankRepository;
import com.example.mobinogi.repository.UserRepository;
import com.example.mobinogi.service.file.FileStorageService;
import com.example.mobinogi.service.rank.RankApiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GuildManagementService{

	/** 길드 심사 상태 코드: 대기 */
	private static final String GUILD_STATUS_PENDING = "PENDING";

	/** 길드 심사 상태 코드: 승인 */
	private static final String GUILD_STATUS_APPROVED = "APPROVED";

	/** 길드 심사 상태 코드: 반려 */
	private static final String GUILD_STATUS_REJECTED = "REJECTED";

	/** 길드 멤버 상태 코드: 대기 */
	private static final String MEMBER_STATUS_PENDING = "PENDING";

	/** 길드 멤버 상태 코드: 승인 */
	private static final String MEMBER_STATUS_APPROVED = "APPROVED";

	/** 길드 멤버 상태 코드: 반려 */
	private static final String MEMBER_STATUS_REJECTED = "REJECTED";

	/** 길드 권한: 일반 멤버 */
	private static final int ROLE_MEMBER = 0;

	/** 길드 권한: 부길드장 */
	private static final int ROLE_SUBMASTER = 1;

	/** 길드 권한: 길드장 */
	private static final int ROLE_MASTER = 2;

	/** 랭크 갱신 상태 저장용 Redis 키 prefix */
	private static final String RANK_REFRESH_STATUS_KEY_PREFIX = "guild:rank-refresh:status:";

	/** 랭크 갱신 상태: 대기 */
	private static final String RANK_REFRESH_STATUS_IDLE = "IDLE";

	/** 랭크 갱신 상태: 실행 중 */
	private static final String RANK_REFRESH_STATUS_RUNNING = "RUNNING";

	/** 랭크 갱신 상태: 완료 */
	private static final String RANK_REFRESH_STATUS_COMPLETED = "COMPLETED";

	/** 랭크 갱신 상태: 실패 */
	private static final String RANK_REFRESH_STATUS_FAILED = "FAILED";

	/** 길드 리포지토리 */
	private final GuildRepository guildRepository;

	/** 길드 게시판 카테고리 리포지토리 */
	private final GuildBoardCategoryRepository guildBoardCategoryRepository;

	/** 길드 게시판 글 리포지토리 */
	private final GuildBoardPostRepository guildBoardPostRepository;

	/** 길드 갤러리 리포지토리 */
	private final GuildGalleryImageRepository guildGalleryImageRepository;

	/** 길드 갤러리 좋아요 리포지토리 */
	private final GuildGalleryLikeRepository guildGalleryLikeRepository;

	/** 사용자 리포지토리 */
	private final UserRepository userRepository;

	/** 길드 멤버십 리포지토리 */
	private final UserGuildRepository userGuildRepository;

	/** 랭크 캐시 리포지토리 */
	private final UserRankRepository userRankRepository;

	/** 파일 업로드/승격 서비스 */
	private final FileStorageService fileStorageService;

	/** 외부 랭크 API 연동 서비스 */
	private final RankApiService rankApiService;

	/** 랭크 갱신 상태 저장용 Redis 템플릿 */
	private final RedisTemplate<String, Object> redisTemplate;

	/** 랭크 갱신 상태 TTL(초) */
	@Value("${guild.refresh.status.ttl-seconds:3600}")
	/**
	 * Field guildRefreshStatusTtlSeconds.
	 */
	private long guildRefreshStatusTtlSeconds;

	/** 백엔드 Redis 상태 저장 활성화 여부 */
	@Value("${guild.refresh.status.backend-redis-enabled:false}")
	/**
	 * Field guildRefreshStatusBackendRedisEnabled.
	 */
	private boolean guildRefreshStatusBackendRedisEnabled;

	/**
	 * 길드 대시보드 데이터를 조회합니다.
	 *
	 * @param userId 현재 사용자 ID
	 * @return 대시보드 DTO
	 */
	public GuildDashboardDto getDashboard(Long userId){
		List<UserGuild> approvedGuildEntities = guildRepository.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(GUILD_STATUS_APPROVED);
		Map<Long, String> approvedGuildMasterNamesByGuildId = resolveGuildMasterNamesByGuildIds(
			approvedGuildEntities.stream()
				.map(UserGuild::getGuildId)
				.distinct()
				.toList()
		);
		List<UserGuildDto> approvedGuilds = approvedGuildEntities.stream()
			.map(guild -> toGuildDto(guild, approvedGuildMasterNamesByGuildId.get(guild.getGuildId())))
			.toList();

		boolean isLoggedIn = userId != null;
		User actor = null;
		boolean isAdmin = false;
		List<UserGuildDto> ownedGuildRequests = List.of();
		List<UserGuildDto> adminPendingGuilds = List.of();
		UserGuildDto myApprovedGuild = null;
		UserGuildMemberDto myMembership = null;
		boolean canManageMembers = false;
		List<UserGuildMemberDto> guildMembers = List.of();
		List<UserGuildMemberDto> pendingGuildMembers = List.of();
		List<UserGuildMemberDto> myPendingJoinRequests = List.of();

		if(isLoggedIn){
			// 로그인 사용자일 때만 개인화 데이터(내 길드/멤버십/관리 권한)를 계산합니다.
			actor = getActiveUser(userId);
			isAdmin = isAdmin(actor);
			ownedGuildRequests = guildRepository
				.findByOwner_UserIdAndDeletedAtIsNullOrderByCreatedAtDesc(userId)
				.stream()
				.map(this::toGuildDto)
				.toList();
			adminPendingGuilds = isAdmin
				? guildRepository.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(GUILD_STATUS_PENDING)
					.stream()
					.map(this::toGuildDto)
					.toList()
				: List.of();

			var membershipOpt = userGuildRepository.findFirstByUser_UserIdAndMemberStatusAndDeletedAtIsNullOrderByUpdatedAtDesc(
				userId,
				MEMBER_STATUS_APPROVED
			);
			if(membershipOpt.isPresent() && membershipOpt.get().getGuild() != null){
				UserGuildMember membership = membershipOpt.get();
				UserGuild guild = membership.getGuild();
				myApprovedGuild = toGuildDto(guild, approvedGuildMasterNamesByGuildId.get(guild.getGuildId()));
				canManageMembers = canManageGuildMembers(actor, guild);

				List<UserGuildMember> allGuildRows = userGuildRepository.findByGuild_GuildIdAndDeletedAtIsNullOrderByGuildRoleDescMemberNameAsc(
					guild.getGuildId()
				);
				GuildMemberRankIndex rankIndex = buildGuildMemberRankIndex(allGuildRows);
				List<UserGuildMemberDto> allGuildMemberDtos = allGuildRows.stream()
					.map(row -> toGuildMemberDto(row, rankIndex))
					.toList();
				guildMembers = allGuildMemberDtos;
				myMembership = allGuildMemberDtos.stream()
					.filter(dto -> dto.getId() != null && dto.getId().equals(membership.getId()))
					.findFirst()
					.orElseGet(() -> toGuildMemberDto(membership, rankIndex));
				if(canManageMembers){
					pendingGuildMembers = allGuildMemberDtos.stream()
						.filter(dto -> MEMBER_STATUS_PENDING.equalsIgnoreCase(dto.getMemberStatus()))
						.toList();
				}
			}

			myPendingJoinRequests = userGuildRepository
				.findByUser_UserIdAndMemberStatusAndDeletedAtIsNullOrderByCreatedAtDesc(userId, MEMBER_STATUS_PENDING)
				.stream()
				.map(this::toGuildMemberDtoWithoutRank)
				.toList();
		}

		return GuildDashboardDto.builder()
			.isAdmin(isAdmin)
			.myApprovedGuild(myApprovedGuild)
			.myMembership(myMembership)
			.canManageMembers(canManageMembers)
			.guildMembers(guildMembers)
			.pendingGuildMembers(pendingGuildMembers)
			.ownedGuildRequests(ownedGuildRequests)
			.myPendingJoinRequests(myPendingJoinRequests)
			.approvedGuilds(approvedGuilds)
			.adminPendingGuilds(adminPendingGuilds)
			.build();
	}

	/**
	 * 길드 등록 요청을 생성합니다.
	 *
	 * @param userId 요청 사용자 ID
	 * @param request 길드 등록 요청
	 * @return 생성된 길드 DTO
	 */
	@Transactional
	public UserGuildDto registerGuild(Long userId, GuildRegisterRequest request){
		User actor = getActiveUser(userId);
		String guildName = normalizeRequired(request.getGuildName(), "guildName");
		String description = normalizeGuildDescription(request.getDescription());
		Integer serverId = validateServerId(request.getServerId(), "serverId");

		if(guildRepository.existsByGuildNameIgnoreCaseAndDeletedAtIsNull(guildName)){
			throw new RuntimeException("이미 존재하는 길드명입니다.");
		}

		boolean hasOwnedGuild = guildRepository.existsByOwner_UserIdAndStatusInAndDeletedAtIsNull(
			userId,
			List.of(GUILD_STATUS_PENDING, GUILD_STATUS_APPROVED)
		);
		if(hasOwnedGuild){
			throw new RuntimeException("이미 소유 중이거나 심사 중인 길드가 있습니다.");
		}

		UserGuild created = guildRepository.save(
			UserGuild.builder()
				.guildName(guildName)
				.description(description)
				.serverId(serverId)
				.owner(actor)
				.status(GUILD_STATUS_PENDING)
				.build()
		);
		return toGuildDto(created);
	}

	/**
	 * 관리 가능한 길드의 소개글을 수정합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param description 길드 소개글
	 * @return 수정된 길드 DTO
	 */
	@Transactional
	public UserGuildDto updateGuildDescription(Long actorUserId, String description){
		User actor = getActiveUser(actorUserId);
		UserGuild guild = resolveManageableGuild(actor);
		String normalizedDescription = normalizeGuildDescription(description);
		if(normalizedDescription != null && normalizedDescription.length() > 500){
			throw new RuntimeException("길드 소개글은 500자 이하로 입력해 주세요.");
		}
		guild.setDescription(normalizedDescription);
		return toGuildDto(guildRepository.save(guild));
	}

	/**
	 * 길드 가입 신청을 생성합니다.
	 *
	 * @param userId 요청 사용자 ID
	 * @param request 가입 신청 요청
	 * @return 생성된 멤버십 DTO
	 */
	@Transactional
	public UserGuildMemberDto requestJoinGuild(Long userId, GuildJoinRequest request){
		User actor = getActiveUser(userId);
		Long guildId = request.getGuildId();
		if(guildId == null){
			throw new RuntimeException("guildId는 필수입니다.");
		}
		UserGuild guild = guildRepository.findByGuildIdAndDeletedAtIsNull(guildId)
			.orElseThrow(() -> new RuntimeException("길드를 찾을 수 없습니다."));
		if(!GUILD_STATUS_APPROVED.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("승인된 길드만 가입 신청할 수 있습니다.");
		}
		if(userGuildRepository.existsByUser_UserIdAndMemberStatusAndDeletedAtIsNull(userId, MEMBER_STATUS_APPROVED)){
			throw new RuntimeException("이미 다른 길드에 가입되어 있습니다.");
		}
		if(userGuildRepository.existsByGuild_GuildIdAndUser_UserIdAndMemberStatusAndDeletedAtIsNull(guildId, userId, MEMBER_STATUS_PENDING)){
			throw new RuntimeException("이미 가입 신청이 접수되어 있습니다.");
		}
		if(userGuildRepository.existsByGuild_GuildIdAndUser_UserIdAndMemberStatusAndDeletedAtIsNull(guildId, userId, MEMBER_STATUS_APPROVED)){
			throw new RuntimeException("이미 해당 길드에 가입되어 있습니다.");
		}

		UserGuildMember created = userGuildRepository.save(UserGuildMember.builder()
				.guild(guild)
				.guildName(guild.getGuildName())
				.user(actor)
				.memberName(normalizeRequired(request.getMemberName(), "memberName"))
				.serverId(guild.getServerId())
				.guildRole(ROLE_MEMBER)
				.memberStatus(MEMBER_STATUS_PENDING)
				.build()
		);
		return toGuildMemberDto(created);
	}

	/**
	 * 대기 중인 가입 신청을 승인합니다.
	 *
	 * @param actorUserId 승인 사용자 ID
	 * @param memberId 멤버십 ID
	 * @return 승인된 멤버십 DTO
	 */
	@Transactional
	public UserGuildMemberDto approveMember(Long actorUserId, Long memberId){
		User actor = getActiveUser(actorUserId);
		UserGuildMember target = userGuildRepository.findByIdAndDeletedAtIsNull(memberId)
			.orElseThrow(() -> new RuntimeException("길드 멤버를 찾을 수 없습니다."));
		UserGuild guild = requireGuild(target);
		if(!canManageGuildMembers(actor, guild)){
			throw new RuntimeException("길드 멤버를 관리할 권한이 없습니다.");
		}
		if(!MEMBER_STATUS_PENDING.equalsIgnoreCase(target.getMemberStatus())){
			throw new RuntimeException("가입 대기 상태의 멤버만 승인할 수 있습니다.");
		}
		target.setMemberStatus(MEMBER_STATUS_APPROVED);
		target.setApprovedByUserId(actorUserId);
		target.setApprovedAt(LocalDateTime.now());
		if(target.getGuildRole() == null){
			target.setGuildRole(ROLE_MEMBER);
		}
		if(target.getServerId() == null && guild.getServerId() != null){
			target.setServerId(guild.getServerId());
		}
		return toGuildMemberDto(userGuildRepository.save(target));
	}

	/**
	 * 대기 중인 가입 신청을 거절합니다.
	 *
	 * @param actorUserId 승인 사용자 ID
	 * @param memberId 멤버십 ID
	 * @return 거절된 멤버십 DTO
	 */
	@Transactional
	public UserGuildMemberDto rejectMember(Long actorUserId, Long memberId){
		User actor = getActiveUser(actorUserId);
		UserGuildMember target = userGuildRepository.findByIdAndDeletedAtIsNull(memberId)
			.orElseThrow(() -> new RuntimeException("길드 멤버를 찾을 수 없습니다."));
		UserGuild guild = requireGuild(target);
		if(!canManageGuildMembers(actor, guild)){
			throw new RuntimeException("길드 멤버를 관리할 권한이 없습니다.");
		}
		if(!MEMBER_STATUS_PENDING.equalsIgnoreCase(target.getMemberStatus())){
			throw new RuntimeException("가입 대기 상태의 멤버만 거절할 수 있습니다.");
		}
		target.setMemberStatus(MEMBER_STATUS_REJECTED);
		target.setApprovedByUserId(actorUserId);
		target.setApprovedAt(LocalDateTime.now());
		return toGuildMemberDto(userGuildRepository.save(target));
	}

	/**
	 * 길드 멤버 역할을 변경합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param memberId 대상 멤버십 ID
	 * @param guildRole 변경할 역할
	 * @return 변경된 멤버십 DTO
	 */
	@Transactional
	public UserGuildMemberDto updateMemberRole(Long actorUserId, Long memberId, Integer guildRole){
		if(guildRole == null || guildRole < ROLE_MEMBER || guildRole > ROLE_MASTER){
			throw new RuntimeException("guildRole은 0~2 범위여야 합니다.");
		}
		User actor = getActiveUser(actorUserId);
		UserGuildMember target = userGuildRepository.findByIdAndDeletedAtIsNull(memberId)
			.orElseThrow(() -> new RuntimeException("길드 멤버를 찾을 수 없습니다."));
		UserGuild guild = requireGuild(target);
		if(!canChangeGuildRole(actor, guild)){
			throw new RuntimeException("길드 역할을 변경할 권한이 없습니다.");
		}
		if(target.getUser() != null
			&& guild.getOwner() != null
			&& target.getUser().getUserId().equals(guild.getOwner().getUserId())
			&& !isAdmin(actor)
			&& guildRole < ROLE_MASTER){
			throw new RuntimeException("길드장은 ROLE_MASTER(2)보다 낮은 권한으로 변경할 수 없습니다.");
		}
		target.setGuildRole(guildRole);
		return toGuildMemberDto(userGuildRepository.save(target));
	}

	/**
	 * 길드 멤버를 수동 추가합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param request 멤버 생성 요청
	 * @return 생성된 멤버십 DTO
	 */
	@Transactional
	public UserGuildMemberDto createMember(Long actorUserId, GuildMemberManageRequest request){
		User actor = getActiveUser(actorUserId);
		UserGuild guild = resolveManageableGuild(actor);

		String memberName = normalizeRequired(request.getMemberName(), "memberName");
		Integer serverId = validateServerId(guild.getServerId(), "guild.serverId");
		ensureMemberNameNotDuplicated(guild.getGuildId(), memberName, null);

		UserGuildMember created = userGuildRepository.save(
			UserGuildMember.builder()
				.guild(guild)
				.guildName(guild.getGuildName())
				.memberName(memberName)
				.serverId(serverId)
				.guildRole(ROLE_MEMBER)
				.memberStatus(MEMBER_STATUS_APPROVED)
				.approvedByUserId(actorUserId)
				.approvedAt(LocalDateTime.now())
				.build()
		);
		return toGuildMemberDto(created);
	}

	/**
	 * 길드 멤버 기본 정보를 수정합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param memberId 대상 멤버십 ID
	 * @param request 수정 요청
	 * @return 수정된 멤버십 DTO
	 */
	@Transactional
	public UserGuildMemberDto updateMemberInfo(Long actorUserId, Long memberId, GuildMemberManageRequest request){
		User actor = getActiveUser(actorUserId);
		UserGuildMember target = userGuildRepository.findByIdAndDeletedAtIsNull(memberId)
			.orElseThrow(() -> new RuntimeException("길드 멤버를 찾을 수 없습니다."));
		UserGuild guild = requireGuild(target);
		if(!canManageGuildMembers(actor, guild)){
			throw new RuntimeException("길드 멤버를 관리할 권한이 없습니다.");
		}

		String memberName = normalizeRequired(request.getMemberName(), "memberName");
		Integer serverId = request.getServerId() != null
			? validateServerId(request.getServerId(), "serverId")
			: resolveMemberServerId(target.getServerId(), guild);
		ensureMemberNameNotDuplicated(guild.getGuildId(), memberName, target.getId());

		target.setMemberName(memberName);
		target.setServerId(serverId);
		return toGuildMemberDto(userGuildRepository.save(target));
	}

	/**
	 * 길드 멤버를 삭제(soft delete)합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param memberId 대상 멤버십 ID
	 */
	@Transactional
	public void deleteMember(Long actorUserId, Long memberId){
		User actor = getActiveUser(actorUserId);
		UserGuildMember target = userGuildRepository.findByIdAndDeletedAtIsNull(memberId)
			.orElseThrow(() -> new RuntimeException("길드 멤버를 찾을 수 없습니다."));
		UserGuild guild = requireGuild(target);
		if(!canManageGuildMembers(actor, guild)){
			throw new RuntimeException("길드 멤버를 관리할 권한이 없습니다.");
		}
		if(target.getUser() != null
			&& guild.getOwner() != null
			&& target.getUser().getUserId().equals(guild.getOwner().getUserId())
			&& !isAdmin(actor)){
			throw new RuntimeException("길드장은 삭제할 수 없습니다.");
		}

		target.setDeletedAt(LocalDateTime.now());
		userGuildRepository.save(target);
	}

	/**
	 * 길드 멤버 랭크 갱신을 수행합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param requestedTargets 갱신 대상 목록
	 * @return 갱신 결과 요약
	 */
	@Transactional
	public GuildMemberRankRefreshSummaryDto refreshMemberRanks(
		Long actorUserId,
		List<GuildMemberRankRefreshTargetRequest> requestedTargets
	){
		User actor = getActiveUser(actorUserId);
		UserGuildMember membership = resolveApprovedMembership(actor);
		UserGuild guild = requireGuild(membership);
		if(!GUILD_STATUS_APPROVED.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("승인된 길드만 랭크 갱신이 가능합니다.");
		}
		boolean canManageMembers = canManageGuildMembers(actor, guild);
		List<GuildMemberRankRefreshTargetRequest> effectiveRequestedTargets = requestedTargets;
		if(!canManageMembers){
			// 관리 권한이 없으면 본인 캐릭터만 갱신 대상으로 제한합니다.
			GuildMemberRankRefreshTargetRequest selfTarget = new GuildMemberRankRefreshTargetRequest();
			selfTarget.setMemberName(normalizeOptional(membership.getMemberName()));
			Integer selfServerId = membership.getServerId() != null ? membership.getServerId() : guild.getServerId();
			selfTarget.setServerId(selfServerId);
			effectiveRequestedTargets = List.of(selfTarget);
		}
		Long guildId = guild.getGuildId();
		List<UserGuildMember> guildMembers = userGuildRepository.findByGuild_GuildIdAndDeletedAtIsNullOrderByGuildRoleDescMemberNameAsc(
			guildId
		);
		GuildMemberRankRefreshStatusDto existingStatus = resolveRankRefreshStatus(guildId);
		if(Boolean.TRUE.equals(existingStatus.getRefreshing())
			&& RANK_REFRESH_STATUS_RUNNING.equalsIgnoreCase(existingStatus.getStatus())){
			throw new RuntimeException("이미 랭크 갱신 작업이 진행 중입니다.");
		}

		int requestedCount = 0;
		int successCount = 0;
		int failedCount = 0;
		int skippedCount = 0;
		Set<String> requestedKeys = new HashSet<>();
		Map<String, UserGuildMember> guildMembersByName = new HashMap<>();
		List<RankRefreshTarget> targets = new java.util.ArrayList<>();
		LocalDateTime startedAt = LocalDateTime.now();

		for(UserGuildMember member : guildMembers){
			String memberName = normalizeOptional(member.getMemberName());
			if(memberName == null){
				continue;
			}
			guildMembersByName.putIfAbsent(memberName.toLowerCase(Locale.ROOT), member);
		}

		try{
			boolean useRequestedTargets = effectiveRequestedTargets != null && !effectiveRequestedTargets.isEmpty();
			if(useRequestedTargets){
				for(GuildMemberRankRefreshTargetRequest target : effectiveRequestedTargets){
					if(target == null){
						skippedCount += 1;
						continue;
					}

					String requestedMemberName = normalizeOptional(target.getMemberName());
					if(requestedMemberName == null){
						skippedCount += 1;
						continue;
					}

					UserGuildMember guildMember = guildMembersByName.get(requestedMemberName.toLowerCase(Locale.ROOT));
					if(guildMember == null){
						skippedCount += 1;
						continue;
					}

					String memberName = normalizeOptional(guildMember.getMemberName());
					Integer serverId = target.getServerId() != null
						? target.getServerId()
						: (guildMember.getServerId() != null ? guildMember.getServerId() : guild.getServerId());
					if(memberName == null || serverId == null || serverId < 1 || serverId > 7){
						skippedCount += 1;
						continue;
					}

					String dedupeKey = serverId + ":" + memberName.toLowerCase(Locale.ROOT);
					if(!requestedKeys.add(dedupeKey)){
						skippedCount += 1;
						continue;
					}
					targets.add(new RankRefreshTarget(memberName, serverId));
				}
			}else{
				for(UserGuildMember member : guildMembers){
					String memberName = normalizeOptional(member.getMemberName());
					Integer serverId = member.getServerId() != null ? member.getServerId() : guild.getServerId();
					if(memberName == null || serverId == null || serverId < 1 || serverId > 7){
						skippedCount += 1;
						continue;
					}

					String dedupeKey = serverId + ":" + memberName.toLowerCase(Locale.ROOT);
					if(!requestedKeys.add(dedupeKey)){
						skippedCount += 1;
						continue;
					}
					targets.add(new RankRefreshTarget(memberName, serverId));
				}
			}

			requestedCount = targets.size();
			writeRankRefreshStatus(
				GuildMemberRankRefreshStatusDto.builder()
					.guildId(guildId)
					.refreshing(true)
					.status(RANK_REFRESH_STATUS_RUNNING)
					.requestedByUserId(actorUserId)
					.totalMemberCount(guildMembers.size())
					.requestedCount(requestedCount)
					.successCount(0)
					.failedCount(0)
					.skippedCount(skippedCount)
					.startedAt(startedAt)
					.updatedAt(LocalDateTime.now())
					.build()
			);

			if(requestedCount > 0){
				List<RankApiService.RankBatchTarget> batchTargets = targets.stream()
					.map(target -> RankApiService.RankBatchTarget.builder()
						.characterName(target.memberName())
						.serverId(target.serverId())
						.build())
					.toList();
				RankApiService.RankBatchStats batchStats = rankApiService.fetchRankStatsBatch(guildId, batchTargets);
				requestedCount = batchStats.getRequestedCount() != null ? batchStats.getRequestedCount() : requestedCount;
				if(batchStats.getSkippedCount() != null && batchStats.getSkippedCount() > 0){
					skippedCount += batchStats.getSkippedCount();
				}

				if(Boolean.TRUE.equals(batchStats.getAccepted())){
					Integer acceptedCount = batchStats.getAcceptedCount() != null ? batchStats.getAcceptedCount() : requestedCount;
					requestedCount = acceptedCount != null ? acceptedCount : requestedCount;
					successCount = 0;
					failedCount = 0;

					writeRankRefreshStatus(
						GuildMemberRankRefreshStatusDto.builder()
							.guildId(guildId)
							.refreshing(true)
							.status(RANK_REFRESH_STATUS_RUNNING)
							.requestedByUserId(actorUserId)
							.totalMemberCount(guildMembers.size())
							.requestedCount(requestedCount)
							.successCount(successCount)
							.failedCount(failedCount)
							.skippedCount(skippedCount)
							.startedAt(startedAt)
							.updatedAt(LocalDateTime.now())
							.build()
					);

					return GuildMemberRankRefreshSummaryDto.builder()
						.guildId(guildId)
						.totalMemberCount(guildMembers.size())
						.requestedCount(requestedCount)
						.successCount(successCount)
						.failedCount(failedCount)
						.skippedCount(skippedCount)
						.refreshedAt(LocalDateTime.now())
						.build();
				}

				successCount = batchStats.getSuccessCount() != null ? batchStats.getSuccessCount() : 0;
				failedCount = batchStats.getFailedCount() != null ? batchStats.getFailedCount() : Math.max(0, requestedCount - successCount);
			}

			LocalDateTime finishedAt = LocalDateTime.now();
			GuildMemberRankRefreshSummaryDto summary = GuildMemberRankRefreshSummaryDto.builder()
				.guildId(guildId)
				.totalMemberCount(guildMembers.size())
				.requestedCount(requestedCount)
				.successCount(successCount)
				.failedCount(failedCount)
				.skippedCount(skippedCount)
				.refreshedAt(finishedAt)
				.build();

			writeRankRefreshStatus(
				GuildMemberRankRefreshStatusDto.builder()
					.guildId(guildId)
					.refreshing(false)
					.status(RANK_REFRESH_STATUS_COMPLETED)
					.requestedByUserId(actorUserId)
					.totalMemberCount(guildMembers.size())
					.requestedCount(requestedCount)
					.successCount(successCount)
					.failedCount(failedCount)
					.skippedCount(skippedCount)
					.startedAt(startedAt)
					.finishedAt(finishedAt)
					.updatedAt(finishedAt)
					.build()
			);
			return summary;
		}catch(RuntimeException e){
			writeRankRefreshStatus(
				GuildMemberRankRefreshStatusDto.builder()
					.guildId(guildId)
					.refreshing(false)
					.status(RANK_REFRESH_STATUS_FAILED)
					.requestedByUserId(actorUserId)
					.totalMemberCount(guildMembers.size())
					.requestedCount(requestedCount)
					.successCount(successCount)
					.failedCount(failedCount)
					.skippedCount(skippedCount)
					.startedAt(startedAt)
					.finishedAt(LocalDateTime.now())
					.updatedAt(LocalDateTime.now())
					.message(e.getMessage())
					.build()
			);
			throw e;
		}
	}

	/**
	 * 길드 랭크 갱신 상태를 조회합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @return 랭크 갱신 상태 DTO
	 */
	public GuildMemberRankRefreshStatusDto getMemberRankRefreshStatus(Long actorUserId){
		User actor = getActiveUser(actorUserId);
		UserGuildMember membership = resolveApprovedMembership(actor);
		UserGuild guild = requireGuild(membership);
		if(!GUILD_STATUS_APPROVED.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("승인된 길드만 랭크 갱신이 가능합니다.");
		}
		return resolveRankRefreshStatus(guild.getGuildId());
	}

	/**
	 * 길드 등록 요청을 승인합니다.
	 *
	 * @param adminUserId 관리자 사용자 ID
	 * @param guildId 길드 ID
	 * @param reviewNote 심사 메모
	 * @param level 승인 시 설정할 길드 레벨
	 * @return 승인된 길드 DTO
	 */
	@Transactional
	public UserGuildDto approveGuild(Long adminUserId, Long guildId, String reviewNote, Integer level){
		User admin = getActiveUser(adminUserId);
		ensureAdmin(admin);
		UserGuild guild = guildRepository.findByGuildIdAndDeletedAtIsNull(guildId)
			.orElseThrow(() -> new RuntimeException("길드를 찾을 수 없습니다."));
		if(!GUILD_STATUS_PENDING.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("대기 상태의 길드만 승인할 수 있습니다.");
		}
		guild.setStatus(GUILD_STATUS_APPROVED);
		guild.setReviewedBy(admin);
		guild.setReviewedAt(LocalDateTime.now());
		guild.setReviewNote(normalizeOptional(reviewNote));
		Integer resolvedLevel = level != null ? validateGuildLevel(level, "level") : guild.getLevel();
		guild.setLevel(resolvedLevel != null ? resolvedLevel : 0);
		UserGuild approved = guildRepository.save(guild);

		createOrUpdateOwnerMembership(adminUserId, approved);
		return toGuildDto(approved);
	}

	/**
	 * 길드 등록 요청을 반려합니다.
	 *
	 * @param adminUserId 관리자 사용자 ID
	 * @param guildId 길드 ID
	 * @param reviewNote 심사 메모
	 * @return 반려된 길드 DTO
	 */
	@Transactional
	public UserGuildDto rejectGuild(Long adminUserId, Long guildId, String reviewNote){
		User admin = getActiveUser(adminUserId);
		ensureAdmin(admin);
		UserGuild guild = guildRepository.findByGuildIdAndDeletedAtIsNull(guildId)
			.orElseThrow(() -> new RuntimeException("길드를 찾을 수 없습니다."));
		if(!GUILD_STATUS_PENDING.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("대기 상태의 길드만 반려할 수 있습니다.");
		}
		guild.setStatus(GUILD_STATUS_REJECTED);
		guild.setReviewedBy(admin);
		guild.setReviewedAt(LocalDateTime.now());
		guild.setReviewNote(normalizeOptional(reviewNote));
		return toGuildDto(guildRepository.save(guild));
	}

	/**
	 * 길드 레벨을 수정합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param guildId 길드 ID
	 * @param level 변경할 길드 레벨
	 * @return 수정된 길드 DTO
	 */
	@Transactional
	public UserGuildDto updateGuildLevel(Long actorUserId, Long guildId, Integer level){
		User actor = getActiveUser(actorUserId);
		UserGuild guild = guildRepository.findByGuildIdAndDeletedAtIsNull(guildId)
			.orElseThrow(() -> new RuntimeException("Guild not found."));
		if(!GUILD_STATUS_APPROVED.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("Only approved guild can update level.");
		}
		UserGuildMember membership = userGuildRepository
			.findByGuild_GuildIdAndUser_UserIdAndDeletedAtIsNull(guildId, actor.getUserId())
			.orElseThrow(() -> new RuntimeException("Approved membership is required."));
		boolean isApprovedMember = MEMBER_STATUS_APPROVED.equalsIgnoreCase(membership.getMemberStatus());
		boolean hasManageRole = membership.getGuildRole() != null && membership.getGuildRole() >= ROLE_SUBMASTER;
		if(!isApprovedMember || !hasManageRole){
			throw new RuntimeException("Only approved submaster or master can update level.");
		}
		guild.setLevel(validateGuildLevel(level, "level"));
		return toGuildDto(guildRepository.save(guild));
	}

	/**
	 * 길드 갤러리 이미지를 조회합니다.
	 *
	 * @param guildId 길드 ID
	 * @param limit 조회 최대 개수
	 * @return 갤러리 이미지 DTO 목록
	 */
	public List<GuildGalleryImageDto> getGuildGallery(Long guildId, Integer limit){
		UserGuild guild = resolveApprovedGuild(guildId);
		Integer normalizedLimit = normalizeListLimit(limit, 100);
		List<UserGuildGalleryImage> rows = normalizedLimit == null
			? guildGalleryImageRepository.findByGuild_GuildIdAndDeletedAtIsNullOrderByCreatedAtDesc(guild.getGuildId())
			: guildGalleryImageRepository.findByGuild_GuildIdAndDeletedAtIsNullOrderByCreatedAtDesc(
				guild.getGuildId(),
				PageRequest.of(0, normalizedLimit)
			);
		return rows
			.stream()
			.map(this::toGuildGalleryImageDto)
			.toList();
	}

	/**
	 * 길드 갤러리 이미지 좋아요를 토글합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param guildId 길드 ID
	 * @param imageId 이미지 ID
	 * @return 갱신된 이미지 DTO
	 */
	@Transactional
	public GuildGalleryImageDto toggleGuildGalleryImageLike(Long actorUserId, Long guildId, Long imageId){
		User actor = getActiveUser(actorUserId);
		UserGuild guild = resolveApprovedGuild(guildId);
		ensureApprovedGuildMember(actor, guild);
		UserGuildGalleryImage target = guildGalleryImageRepository.findByIdAndDeletedAtIsNull(imageId)
			.orElseThrow(() -> new RuntimeException("Gallery image not found."));
		if(target.getGuild() == null || !guild.getGuildId().equals(target.getGuild().getGuildId())){
			throw new RuntimeException("Gallery image does not belong to this guild.");
		}

		var existingLike = guildGalleryLikeRepository.findByGalleryImage_IdAndUser_UserId(target.getId(), actor.getUserId());
		if(existingLike.isPresent()){
			guildGalleryLikeRepository.delete(existingLike.get());
			int currentLikeCount = target.getLikeCount() != null ? target.getLikeCount() : 0;
			target.setLikeCount(Math.max(0, currentLikeCount - 1));
		}else{
			guildGalleryLikeRepository.save(
				UserGuildGalleryLike.builder()
					.galleryImage(target)
					.user(actor)
					.build()
			);
			int currentLikeCount = target.getLikeCount() != null ? target.getLikeCount() : 0;
			target.setLikeCount(currentLikeCount + 1);
		}
		return toGuildGalleryImageDto(guildGalleryImageRepository.save(target));
	}

	/**
	 * 길드 갤러리 이미지를 생성합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param guildId 길드 ID
	 * @param request 생성 요청
	 * @return 생성된 이미지 DTO
	 */
	@Transactional
	public GuildGalleryImageDto createGuildGalleryImage(Long actorUserId, Long guildId, GuildGalleryImageCreateRequest request){
		if(request == null){
			throw new RuntimeException("Request body is required.");
		}
		User actor = getActiveUser(actorUserId);
		UserGuild guild = resolveApprovedGuild(guildId);
		ensureApprovedGuildMember(actor, guild);

		List<String> imageUrls = normalizeAndResolveGuildGalleryImageUrls(
			actor.getUserId(),
			guild.getGuildId(),
			request.getImageUrls()
		);
		String title = normalizeGuildGalleryTitle(request.getTitle());
		String description = normalizeGuildGalleryDescription(request.getDescription());
		String tags = normalizeGuildGalleryTags(request.getTags());
		UserGuildGalleryImage created = guildGalleryImageRepository.save(
			UserGuildGalleryImage.builder()
				.guild(guild)
				.uploader(actor)
				.imageUrl(serializeImageUrls(imageUrls))
				.title(title)
				.description(description)
				.tags(tags)
				.build()
		);
		return toGuildGalleryImageDto(created);
	}

	/**
	 * 길드 갤러리 이미지를 삭제합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param guildId 길드 ID
	 * @param imageId 이미지 ID
	 */
	@Transactional
	public void deleteGuildGalleryImage(Long actorUserId, Long guildId, Long imageId){
		User actor = getActiveUser(actorUserId);
		UserGuild guild = resolveApprovedGuild(guildId);
		UserGuildGalleryImage target = guildGalleryImageRepository.findByIdAndDeletedAtIsNull(imageId)
			.orElseThrow(() -> new RuntimeException("Gallery image not found."));
		if(target.getGuild() == null || !guild.getGuildId().equals(target.getGuild().getGuildId())){
			throw new RuntimeException("Gallery image does not belong to this guild.");
		}
		boolean isUploader = target.getUploader() != null && actor.getUserId().equals(target.getUploader().getUserId());
		boolean canManageGuild = canManageGuildMembers(actor, guild);
		if(!isUploader && !canManageGuild){
			throw new RuntimeException("No permission to delete this gallery image.");
		}

		target.setDeletedAt(LocalDateTime.now());
		guildGalleryImageRepository.save(target);
		for(String imageUrl : parseStoredImageUrls(target.getImageUrl())){
			if(imageUrl.startsWith("/api/files/guild-" + guildId + "/")){
				fileStorageService.deleteFile(imageUrl);
			}
		}
	}

	@Transactional
	public GuildGalleryImageDto updateGuildGalleryImage(
		Long actorUserId,
		Long guildId,
		Long imageId,
		GuildGalleryImageCreateRequest request
	){
		if(request == null){
			throw new RuntimeException("Request body is required.");
		}

		User actor = getActiveUser(actorUserId);
		UserGuild guild = resolveApprovedGuild(guildId);
		ensureApprovedGuildMember(actor, guild);

		UserGuildGalleryImage target = guildGalleryImageRepository.findByIdAndDeletedAtIsNull(imageId)
			.orElseThrow(() -> new RuntimeException("Gallery image not found."));
		if(target.getGuild() == null || !guild.getGuildId().equals(target.getGuild().getGuildId())){
			throw new RuntimeException("Gallery image does not belong to this guild.");
		}

		boolean isUploader = target.getUploader() != null && actor.getUserId().equals(target.getUploader().getUserId());
		boolean canManageGuild = canManageGuildMembers(actor, guild);
		if(!isUploader && !canManageGuild){
			throw new RuntimeException("No permission to update this gallery image.");
		}

		List<String> imageUrls = normalizeAndResolveGuildGalleryImageUrls(
			actor.getUserId(),
			guild.getGuildId(),
			request.getImageUrls()
		);
		String title = normalizeGuildGalleryTitle(request.getTitle());
		String description = normalizeGuildGalleryDescription(request.getDescription());
		String tags = normalizeGuildGalleryTags(request.getTags());

		target.setImageUrl(serializeImageUrls(imageUrls));
		target.setTitle(title);
		target.setDescription(description);
		target.setTags(tags);
		return toGuildGalleryImageDto(guildGalleryImageRepository.save(target));
	}

	/**
	 * 길드 게시글 목록을 조회합니다.
	 *
	 * @param guildId 길드 ID
	 * @param limit 조회 최대 개수
	 * @return 게시글 DTO 목록
	 */
	public List<GuildBoardPostDto> getGuildBoardPosts(Long guildId, Integer limit){
		UserGuild guild = resolveApprovedGuild(guildId);
		Integer normalizedLimit = normalizeListLimit(limit, 100);
		List<UserGuildBoardPost> rows = normalizedLimit == null
			? guildBoardPostRepository.findByGuild_GuildIdAndDeletedAtIsNullOrderByCreatedAtDesc(guild.getGuildId())
			: guildBoardPostRepository.findByGuild_GuildIdAndDeletedAtIsNullOrderByCreatedAtDesc(
				guild.getGuildId(),
				PageRequest.of(0, normalizedLimit)
			);
		return rows
			.stream()
			.map(this::toGuildBoardPostDto)
			.toList();
	}

	/**
	 * 길드 게시판 카테고리 목록을 조회합니다.
	 *
	 * @param guildId 길드 ID
	 * @return 카테고리 DTO 목록
	 */
	public List<GuildBoardCategoryDto> getGuildBoardCategories(Long guildId){
		UserGuild guild = resolveApprovedGuild(guildId);
		return guildBoardCategoryRepository.findByGuild_GuildIdAndDeletedAtIsNullOrderBySortOrderAscCreatedAtAsc(guild.getGuildId())
			.stream()
			.map(this::toGuildBoardCategoryDto)
			.toList();
	}

	/**
	 * 길드 게시판 카테고리를 생성합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param guildId 길드 ID
	 * @param request 생성 요청
	 * @return 생성된 카테고리 DTO
	 */
	@Transactional
	public GuildBoardCategoryDto createGuildBoardCategory(Long actorUserId, Long guildId, GuildBoardCategoryCreateRequest request){
		if(request == null){
			throw new RuntimeException("Request body is required.");
		}
		User actor = getActiveUser(actorUserId);
		UserGuild guild = resolveApprovedGuild(guildId);
		ensureCanConfigureGuildBoardCategory(actor, guild);
		String categoryName = normalizeGuildBoardCategoryName(request.getName());
		guildBoardCategoryRepository.findFirstByGuild_GuildIdAndNameIgnoreCaseAndDeletedAtIsNull(guild.getGuildId(), categoryName)
			.ifPresent(existing -> {
				throw new RuntimeException("Category name already exists.");
			});
		int sortOrder = resolveGuildBoardCategorySortOrder(guild.getGuildId(), request.getSortOrder());
		UserGuildBoardCategory created = guildBoardCategoryRepository.save(
			UserGuildBoardCategory.builder()
				.guild(guild)
				.name(categoryName)
				.sortOrder(sortOrder)
				.createdBy(actor)
				.build()
		);
		return toGuildBoardCategoryDto(created);
	}

	/**
	 * 길드 게시판 카테고리를 삭제합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param guildId 길드 ID
	 * @param categoryId 카테고리 ID
	 */
	@Transactional
	public void deleteGuildBoardCategory(Long actorUserId, Long guildId, Long categoryId){
		User actor = getActiveUser(actorUserId);
		UserGuild guild = resolveApprovedGuild(guildId);
		ensureCanConfigureGuildBoardCategory(actor, guild);
		UserGuildBoardCategory category = guildBoardCategoryRepository.findByIdAndDeletedAtIsNull(categoryId)
			.orElseThrow(() -> new RuntimeException("Guild board category not found."));
		if(category.getGuild() == null || !guild.getGuildId().equals(category.getGuild().getGuildId())){
			throw new RuntimeException("Guild board category does not belong to this guild.");
		}
		List<UserGuildBoardPost> categoryPosts = guildBoardPostRepository.findByCategory_IdAndDeletedAtIsNullOrderByCreatedAtDesc(category.getId());
		if(!categoryPosts.isEmpty()){
			for(UserGuildBoardPost categoryPost : categoryPosts){
				categoryPost.setCategory(null);
			}
			guildBoardPostRepository.saveAll(categoryPosts);
		}
		category.setDeletedAt(LocalDateTime.now());
		guildBoardCategoryRepository.save(category);
	}

	/**
	 * 길드 게시글을 생성합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param guildId 길드 ID
	 * @param request 생성 요청
	 * @return 생성된 게시글 DTO
	 */
	@Transactional
	public GuildBoardPostDto createGuildBoardPost(Long actorUserId, Long guildId, GuildBoardPostCreateRequest request){
		if(request == null){
			throw new RuntimeException("Request body is required.");
		}
		User actor = getActiveUser(actorUserId);
		UserGuild guild = resolveApprovedGuild(guildId);
		ensureApprovedGuildMember(actor, guild);

		String title = normalizeRequired(request.getTitle(), "title");
		String content = normalizeRequired(request.getContent(), "content");
		if(title.length() > 200){
			throw new RuntimeException("title must be 200 characters or fewer.");
		}
		if(content.length() > 4000){
			throw new RuntimeException("content must be 4000 characters or fewer.");
		}
		UserGuildBoardCategory category = resolveGuildBoardCategory(guild, request.getCategoryId());

		UserGuildBoardPost created = guildBoardPostRepository.save(
			UserGuildBoardPost.builder()
				.guild(guild)
				.author(actor)
				.category(category)
				.title(title)
				.content(content)
				.build()
		);
		return toGuildBoardPostDto(created);
	}

	/**
	 * 길드 게시글을 삭제합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param guildId 길드 ID
	 * @param postId 게시글 ID
	 */
	@Transactional
	public void deleteGuildBoardPost(Long actorUserId, Long guildId, Long postId){
		User actor = getActiveUser(actorUserId);
		UserGuild guild = resolveApprovedGuild(guildId);
		UserGuildBoardPost target = guildBoardPostRepository.findByIdAndDeletedAtIsNull(postId)
			.orElseThrow(() -> new RuntimeException("Guild board post not found."));
		if(target.getGuild() == null || !guild.getGuildId().equals(target.getGuild().getGuildId())){
			throw new RuntimeException("Guild board post does not belong to this guild.");
		}
		boolean isAuthor = target.getAuthor() != null && actor.getUserId().equals(target.getAuthor().getUserId());
		boolean canManageGuild = canManageGuildMembers(actor, guild);
		if(!isAuthor && !canManageGuild){
			throw new RuntimeException("No permission to delete this guild board post.");
		}
		target.setDeletedAt(LocalDateTime.now());
		guildBoardPostRepository.save(target);
	}

	/**
	 * 랭크 갱신 상태를 Redis에 저장합니다.
	 *
	 * @param status 저장할 상태 DTO
	 */
	private void writeRankRefreshStatus(GuildMemberRankRefreshStatusDto status){
		if(status == null || status.getGuildId() == null){
			return;
		}
		if(!guildRefreshStatusBackendRedisEnabled){
			return;
		}
		try{
			long ttlSeconds = Math.max(60L, guildRefreshStatusTtlSeconds);
			redisTemplate.opsForValue().set(
				buildRankRefreshStatusKey(status.getGuildId()),
				status,
				Duration.ofSeconds(ttlSeconds)
			);
		}catch(Exception e){
			log.warn("Failed to write guild rank refresh status to redis. guildId={}, reason={}", status.getGuildId(), e.getMessage());
		}
	}

	/**
	 * 랭크 갱신 상태를 우선순위(crawler -> backend redis -> idle)로 조회합니다.
	 *
	 * @param guildId 길드 ID
	 * @return 랭크 갱신 상태 DTO
	 */
	private GuildMemberRankRefreshStatusDto resolveRankRefreshStatus(Long guildId){
		GuildMemberRankRefreshStatusDto crawlerStatus = readRankRefreshStatusFromCrawler(guildId);
		if(crawlerStatus != null){
			return crawlerStatus;
		}
		if(guildRefreshStatusBackendRedisEnabled){
			return readRankRefreshStatus(guildId);
		}
		return createIdleRankRefreshStatus(guildId);
	}

	/**
	 * 크롤러 큐 상태 API에서 랭크 갱신 상태를 조회합니다.
	 *
	 * @param guildId 길드 ID
	 * @return 상태 DTO, 조회 실패 시 null
	 */
	private GuildMemberRankRefreshStatusDto readRankRefreshStatusFromCrawler(Long guildId){
		try{
			RankApiService.RankBatchQueueStatus queueStatus = rankApiService.fetchRankBatchQueueStatus(guildId);
			if(queueStatus == null){
				return null;
			}
			boolean refreshing = Boolean.TRUE.equals(queueStatus.getRefreshing());
			String status = normalizeOptional(queueStatus.getRefreshStatus());
			if(status == null){
				status = refreshing ? RANK_REFRESH_STATUS_RUNNING : RANK_REFRESH_STATUS_IDLE;
			}
			return GuildMemberRankRefreshStatusDto.builder()
				.guildId(guildId)
				.refreshing(refreshing)
				.status(status)
				.totalMemberCount(0)
				.requestedCount(queueStatus.getRequestedCount() != null ? queueStatus.getRequestedCount() : 0)
				.successCount(queueStatus.getSuccessCount() != null ? queueStatus.getSuccessCount() : 0)
				.failedCount(queueStatus.getFailedCount() != null ? queueStatus.getFailedCount() : 0)
				.skippedCount(queueStatus.getSkippedCount() != null ? queueStatus.getSkippedCount() : 0)
				.updatedAt(readLocalDateTime(queueStatus.getUpdatedAt()))
				.build();
		}catch(Exception e){
			log.warn("Failed to read guild rank refresh status from crawler. guildId={}, reason={}", guildId, e.getMessage());
			return null;
		}
	}

	/**
	 * Redis에서 랭크 갱신 상태를 조회합니다.
	 *
	 * @param guildId 길드 ID
	 * @return 상태 DTO
	 */
	private GuildMemberRankRefreshStatusDto readRankRefreshStatus(Long guildId){
		if(!guildRefreshStatusBackendRedisEnabled){
			return createIdleRankRefreshStatus(guildId);
		}
		try{
			Object raw = redisTemplate.opsForValue().get(buildRankRefreshStatusKey(guildId));
			if(raw == null){
				return createIdleRankRefreshStatus(guildId);
			}
			if(raw instanceof GuildMemberRankRefreshStatusDto dto){
				if(dto.getGuildId() == null){
					dto.setGuildId(guildId);
				}
				if(dto.getStatus() == null || dto.getStatus().isBlank()){
					dto.setStatus(RANK_REFRESH_STATUS_IDLE);
				}
				if(dto.getRefreshing() == null){
					dto.setRefreshing(false);
				}
				return dto;
			}
			if(raw instanceof Map<?, ?> map){
				return GuildMemberRankRefreshStatusDto.builder()
					.guildId(readLong(map.get("guildId"), guildId))
					.refreshing(readBoolean(map.get("refreshing"), false))
					.status(readString(map.get("status"), RANK_REFRESH_STATUS_IDLE))
					.requestedByUserId(readLong(map.get("requestedByUserId"), null))
					.totalMemberCount(readInteger(map.get("totalMemberCount"), 0))
					.requestedCount(readInteger(map.get("requestedCount"), 0))
					.successCount(readInteger(map.get("successCount"), 0))
					.failedCount(readInteger(map.get("failedCount"), 0))
					.skippedCount(readInteger(map.get("skippedCount"), 0))
					.startedAt(readLocalDateTime(map.get("startedAt")))
					.finishedAt(readLocalDateTime(map.get("finishedAt")))
					.updatedAt(readLocalDateTime(map.get("updatedAt")))
					.message(readString(map.get("message"), null))
					.build();
			}
		}catch(Exception e){
			log.warn("Failed to read guild rank refresh status from redis. guildId={}, reason={}", guildId, e.getMessage());
		}
		return createIdleRankRefreshStatus(guildId);
	}

	/**
	 * 랭크 상태 저장용 Redis 키를 생성합니다.
	 *
	 * @param guildId 길드 ID
	 * @return Redis 키
	 */
	private String buildRankRefreshStatusKey(Long guildId){
		return RANK_REFRESH_STATUS_KEY_PREFIX + guildId;
	}

	/**
	 * 기본 대기(IDLE) 상태 DTO를 생성합니다.
	 *
	 * @param guildId 길드 ID
	 * @return IDLE 상태 DTO
	 */
	private GuildMemberRankRefreshStatusDto createIdleRankRefreshStatus(Long guildId){
		return GuildMemberRankRefreshStatusDto.builder()
			.guildId(guildId)
			.refreshing(false)
			.status(RANK_REFRESH_STATUS_IDLE)
			.totalMemberCount(0)
			.requestedCount(0)
			.successCount(0)
			.failedCount(0)
			.skippedCount(0)
			.updatedAt(LocalDateTime.now())
			.build();
	}

	/**
	 * Object 값을 Integer로 변환합니다.
	 *
	 * @param value 원본 값
	 * @param defaultValue 기본값
	 * @return 변환된 Integer
	 */
	private Integer readInteger(Object value, Integer defaultValue){
		if(value == null){
			return defaultValue;
		}
		if(value instanceof Number number){
			return number.intValue();
		}
		try{
			return Integer.parseInt(String.valueOf(value));
		}catch(Exception ignored){
			return defaultValue;
		}
	}

	/**
	 * Object 값을 Long으로 변환합니다.
	 *
	 * @param value 원본 값
	 * @param defaultValue 기본값
	 * @return 변환된 Long
	 */
	private Long readLong(Object value, Long defaultValue){
		if(value == null){
			return defaultValue;
		}
		if(value instanceof Number number){
			return number.longValue();
		}
		try{
			return Long.parseLong(String.valueOf(value));
		}catch(Exception ignored){
			return defaultValue;
		}
	}

	/**
	 * Object 값을 Boolean으로 변환합니다.
	 *
	 * @param value 원본 값
	 * @param defaultValue 기본값
	 * @return 변환된 Boolean
	 */
	private Boolean readBoolean(Object value, Boolean defaultValue){
		if(value == null){
			return defaultValue;
		}
		if(value instanceof Boolean boolValue){
			return boolValue;
		}
		String normalized = String.valueOf(value).trim().toLowerCase(Locale.ROOT);
		if("true".equals(normalized)){
			return true;
		}
		if("false".equals(normalized)){
			return false;
		}
		return defaultValue;
	}

	/**
	 * Object 값을 문자열로 변환합니다.
	 *
	 * @param value 원본 값
	 * @param defaultValue 기본값
	 * @return 변환된 문자열
	 */
	private String readString(Object value, String defaultValue){
		if(value == null){
			return defaultValue;
		}
		String normalized = String.valueOf(value);
		return normalized.isBlank() ? defaultValue : normalized;
	}

	/**
	 * Object 값을 LocalDateTime으로 변환합니다.
	 *
	 * @param value 원본 값
	 * @return 변환된 LocalDateTime, 실패 시 null
	 */
	private LocalDateTime readLocalDateTime(Object value){
		if(value == null){
			return null;
		}
		if(value instanceof LocalDateTime dateTime){
			return dateTime;
		}
		if(value instanceof OffsetDateTime offsetDateTime){
			return offsetDateTime.toLocalDateTime();
		}
		if(value instanceof Instant instant){
			return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
		}
		try{
			return LocalDateTime.parse(String.valueOf(value));
		}catch(Exception ignored){
			try{
				return OffsetDateTime.parse(String.valueOf(value)).toLocalDateTime();
			}catch(Exception ignoredAgain){
				try{
					return LocalDateTime.ofInstant(Instant.parse(String.valueOf(value)), ZoneId.systemDefault());
				}catch(Exception ignoredFinal){
					return null;
				}
			}
		}
	}

	/**
	 * 랭크 갱신 요청 대상.
	 *
	 * @param memberName 멤버명
	 * @param serverId 서버 ID
	 */
	private record RankRefreshTarget(String memberName, Integer serverId){
	}

	/**
	 * 길드 멤버 랭크 조회 키.
	 *
	 * @param serverId 서버 ID
	 * @param memberName 멤버명
	 */
	private record GuildMemberRankLookupKey(Integer serverId, String memberName){
	}

	private record GuildMemberRankIndex(
		Map<GuildMemberRankLookupKey, UserRank> normalized,
		Map<GuildMemberRankLookupKey, UserRank> compact
	){
	}

	/**
	 * 멤버십에서 길드 엔티티를 강제 조회합니다.
	 *
	 * @param member 길드 멤버십
	 * @return 길드 엔티티
	 */
	private UserGuild requireGuild(UserGuildMember member){
		if(member.getGuild() == null){
			throw new RuntimeException("길드 정보가 없는 멤버입니다.");
		}
		return member.getGuild();
	}

	/**
	 * 길드장 멤버십을 생성 또는 갱신합니다.
	 *
	 * @param approvedByUserId 승인 처리 사용자 ID
	 * @param guild 길드 엔티티
	 */
	private void createOrUpdateOwnerMembership(Long approvedByUserId, UserGuild guild){
		Long ownerUserId = guild.getOwner().getUserId();
		UserGuildMember ownerMembership = userGuildRepository
			.findByGuild_GuildIdAndUser_UserIdAndDeletedAtIsNull(guild.getGuildId(), ownerUserId)
			.orElseGet(() -> UserGuildMember.builder()
				.guild(guild)
				.guildName(guild.getGuildName())
				.user(guild.getOwner())
				.memberName(resolveOwnerMemberName(guild.getOwner()))
				.serverId(guild.getServerId())
				.build());

		ownerMembership.setMemberStatus(MEMBER_STATUS_APPROVED);
		ownerMembership.setGuildRole(ROLE_MASTER);
		ownerMembership.setServerId(guild.getServerId());
		ownerMembership.setApprovedByUserId(approvedByUserId);
		ownerMembership.setApprovedAt(LocalDateTime.now());
		userGuildRepository.save(ownerMembership);
	}

	/**
	 * 길드장 표시용 멤버명을 계산합니다.
	 *
	 * @param owner 길드장 사용자 엔티티
	 * @return 표시 멤버명
	 */
	private String resolveOwnerMemberName(User owner){
		String nickname = normalizeOptional(owner.getNickname());
		if(nickname != null && !nickname.isBlank()){
			return nickname;
		}
		return "owner-" + owner.getUserId();
	}

	/**
	 * 길드 멤버 관리 권한 보유 여부를 확인합니다.
	 *
	 * @param actor 요청 사용자
	 * @param guild 대상 길드
	 * @return 관리 권한 여부
	 */
	private boolean canManageGuildMembers(User actor, UserGuild guild){
		if(isAdmin(actor)){
			return true;
		}
		if(guild.getOwner() != null && guild.getOwner().getUserId().equals(actor.getUserId())){
			return true;
		}
		return userGuildRepository.findByGuild_GuildIdAndUser_UserIdAndDeletedAtIsNull(guild.getGuildId(), actor.getUserId())
			.filter(member -> MEMBER_STATUS_APPROVED.equalsIgnoreCase(member.getMemberStatus()))
			.map(member -> member.getGuildRole() != null && member.getGuildRole() >= ROLE_SUBMASTER)
			.orElse(false);
	}

	/**
	 * 길드 역할 변경 권한 보유 여부를 확인합니다.
	 *
	 * @param actor 요청 사용자
	 * @param guild 대상 길드
	 * @return 역할 변경 권한 여부
	 */
	private boolean canChangeGuildRole(User actor, UserGuild guild){
		if(isAdmin(actor)){
			return true;
		}
		if(guild.getOwner() != null && guild.getOwner().getUserId().equals(actor.getUserId())){
			return true;
		}
		return userGuildRepository.findByGuild_GuildIdAndUser_UserIdAndDeletedAtIsNull(guild.getGuildId(), actor.getUserId())
			.filter(member -> MEMBER_STATUS_APPROVED.equalsIgnoreCase(member.getMemberStatus()))
			.map(member -> member.getGuildRole() != null && member.getGuildRole() >= ROLE_SUBMASTER)
			.orElse(false);
	}

	/**
	 * 요청자가 관리 가능한 승인 길드를 조회합니다.
	 *
	 * @param actor 요청 사용자
	 * @return 관리 가능한 길드
	 */
	private UserGuild resolveManageableGuild(User actor){
		UserGuildMember membership = resolveApprovedMembership(actor);
		UserGuild guild = requireGuild(membership);
		if(!canManageGuildMembers(actor, guild)){
			throw new RuntimeException("길드 멤버를 관리할 권한이 없습니다.");
		}
		if(!GUILD_STATUS_APPROVED.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("승인된 길드만 관리할 수 있습니다.");
		}
		return guild;
	}

	/**
	 * 사용자의 승인된 최신 길드 멤버십을 조회합니다.
	 *
	 * @param actor 요청 사용자
	 * @return 승인된 길드 멤버십
	 */
	private UserGuildMember resolveApprovedMembership(User actor){
		return userGuildRepository
			.findFirstByUser_UserIdAndMemberStatusAndDeletedAtIsNullOrderByUpdatedAtDesc(actor.getUserId(), MEMBER_STATUS_APPROVED)
			.orElseThrow(() -> new RuntimeException("No approved guild membership."));
	}

	/**
	 * 멤버 서버 ID를 후보값/길드 기본값으로 확정합니다.
	 *
	 * @param candidateServerId 후보 서버 ID
	 * @param guild 길드 엔티티
	 * @return 검증된 서버 ID
	 */
	private Integer resolveMemberServerId(Integer candidateServerId, UserGuild guild){
		Integer serverId = candidateServerId != null ? candidateServerId : guild.getServerId();
		return validateServerId(serverId, "serverId");
	}

	/**
	 * 승인 상태 길드를 조회합니다.
	 *
	 * @param guildId 길드 ID
	 * @return 승인된 길드
	 */
	private UserGuild resolveApprovedGuild(Long guildId){
		if(guildId == null){
			throw new RuntimeException("guildId is required.");
		}
		UserGuild guild = guildRepository.findByGuildIdAndDeletedAtIsNull(guildId)
			.orElseThrow(() -> new RuntimeException("Guild not found."));
		if(!GUILD_STATUS_APPROVED.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("Only approved guild is supported.");
		}
		return guild;
	}

	/**
	 * 요청자가 길드 승인 멤버인지 검증합니다.
	 *
	 * @param actor 요청 사용자
	 * @param guild 대상 길드
	 */
	private void ensureApprovedGuildMember(User actor, UserGuild guild){
		if(isAdmin(actor)){
			return;
		}
		if(guild.getOwner() != null && guild.getOwner().getUserId().equals(actor.getUserId())){
			return;
		}
		UserGuildMember membership = userGuildRepository
			.findByGuild_GuildIdAndUser_UserIdAndDeletedAtIsNull(guild.getGuildId(), actor.getUserId())
			.orElseThrow(() -> new RuntimeException("Approved guild membership is required."));
		if(!MEMBER_STATUS_APPROVED.equalsIgnoreCase(membership.getMemberStatus())){
			throw new RuntimeException("Approved guild membership is required.");
		}
	}

	/**
	 * 길드 갤러리 제목을 정규화합니다.
	 *
	 * @param value 원본 제목
	 * @return 정규화된 제목
	 */
	private String normalizeGuildGalleryTitle(String value){
		String normalized = normalizeOptional(value);
		if(normalized == null){
			return null;
		}
		if(normalized.length() > 200){
			throw new RuntimeException("title must be 200 characters or fewer.");
		}
		return normalized;
	}

	/**
	 * 길드 갤러리 설명을 정규화합니다.
	 *
	 * @param value 원본 설명
	 * @return 정규화된 설명
	 */
	private String normalizeGuildGalleryDescription(String value){
		String normalized = normalizeOptional(value);
		if(normalized == null){
			return null;
		}
		if(normalized.length() > 1000){
			throw new RuntimeException("description must be 1000 characters or fewer.");
		}
		return normalized;
	}

	/**
	 * 길드 갤러리 태그 목록을 정규화합니다.
	 *
	 * @param value 원본 태그 문자열
	 * @return 정규화된 태그 문자열
	 */
	private String normalizeGuildGalleryTags(String value){
		String normalized = normalizeOptional(value);
		if(normalized == null){
			return null;
		}
		List<String> tags = Arrays.stream(normalized.split(","))
			.map(this::normalizeGuildGalleryTag)
			.filter(tag -> !tag.isEmpty())
			.distinct()
			.collect(Collectors.toList());
		if(tags.isEmpty()){
			return null;
		}
		String joined = String.join(",", tags);
		if(joined.length() > 500){
			throw new RuntimeException("tags must be 500 characters or fewer.");
		}
		return joined;
	}

	/**
	 * 개별 태그를 정규화합니다.
	 *
	 * @param value 원본 태그
	 * @return 정규화된 태그
	 */
	private String normalizeGuildGalleryTag(String value){
		if(value == null){
			return "";
		}
		return value.trim().replaceFirst("^#+", "").trim();
	}

	/**
	 * 길드 게시판 카테고리명을 정규화합니다.
	 *
	 * @param value 원본 카테고리명
	 * @return 정규화된 카테고리명
	 */
	private String normalizeGuildBoardCategoryName(String value){
		String normalized = normalizeRequired(value, "name");
		if(normalized.length() > 60){
			throw new RuntimeException("name must be 60 characters or fewer.");
		}
		return normalized;
	}

	/**
	 * 카테고리 정렬 순서를 계산합니다.
	 *
	 * @param guildId 길드 ID
	 * @param requestedSortOrder 요청 정렬값
	 * @return 확정 정렬값
	 */
	private int resolveGuildBoardCategorySortOrder(Long guildId, Integer requestedSortOrder){
		if(requestedSortOrder != null){
			if(requestedSortOrder < 0 || requestedSortOrder > 100000){
				throw new RuntimeException("sortOrder must be between 0 and 100000.");
			}
			return requestedSortOrder;
		}
		return guildBoardCategoryRepository.findByGuild_GuildIdAndDeletedAtIsNullOrderBySortOrderAscCreatedAtAsc(guildId)
			.stream()
			.map(UserGuildBoardCategory::getSortOrder)
			.filter(value -> value != null && value >= 0)
			.max(Integer::compareTo)
			.map(value -> value + 10)
			.orElse(0);
	}

	/**
	 * 길드 소속 카테고리를 조회합니다.
	 *
	 * @param guild 길드 엔티티
	 * @param categoryId 카테고리 ID
	 * @return 카테고리 엔티티
	 */
	private UserGuildBoardCategory resolveGuildBoardCategory(UserGuild guild, Long categoryId){
		if(categoryId == null){
			return null;
		}
		UserGuildBoardCategory category = guildBoardCategoryRepository.findByIdAndDeletedAtIsNull(categoryId)
			.orElseThrow(() -> new RuntimeException("Guild board category not found."));
		if(category.getGuild() == null || !guild.getGuildId().equals(category.getGuild().getGuildId())){
			throw new RuntimeException("Guild board category does not belong to this guild.");
		}
		return category;
	}

	/**
	 * 게시판 카테고리 설정 권한을 검증합니다.
	 *
	 * @param actor 요청 사용자
	 * @param guild 대상 길드
	 */
	private void ensureCanConfigureGuildBoardCategory(User actor, UserGuild guild){
		if(!canManageGuildMembers(actor, guild)){
			throw new RuntimeException("Only approved submaster or master can manage board categories.");
		}
	}

	/**
	 * 갤러리 이미지 URL을 검증하고 최종 저장 경로를 확정합니다.
	 *
	 * @param actorUserId 요청 사용자 ID
	 * @param guildId 길드 ID
	 * @param imageUrl 원본 이미지 URL
	 * @return 확정된 이미지 URL
	 */
	private String normalizeAndResolveGuildGalleryImageUrl(Long actorUserId, Long guildId, String imageUrl){
		String normalized = normalizeRequired(imageUrl, "imageUrl");
		String guildSubDir = "guild-" + guildId;
		String finalPrefix = "/api/files/" + guildSubDir + "/";
		if(normalized.startsWith("/api/files/_tmp-")){
			try{
				return fileStorageService.promoteTempFile(normalized, guildSubDir, actorUserId);
			}catch(Exception e){
				throw new RuntimeException("Failed to finalize uploaded image: " + e.getMessage(), e);
			}
		}
		if(normalized.startsWith(finalPrefix)){
			return normalized;
		}
		throw new RuntimeException("Unsupported image URL. Upload image first.");
	}

	private List<String> normalizeAndResolveGuildGalleryImageUrls(
		Long actorUserId,
		Long guildId,
		List<String> imageUrls
	){
		List<String> rawUrls = new ArrayList<>();
		if(imageUrls != null){
			rawUrls.addAll(
				imageUrls.stream()
					.map(value -> value == null ? "" : value.trim())
					.filter(value -> !value.isEmpty())
					.toList()
			);
		}
		if(rawUrls.isEmpty()){
			throw new RuntimeException("imageUrls is required.");
		}
		List<String> deduped = new ArrayList<>(new LinkedHashSet<>(rawUrls));
		List<String> resolved = deduped.stream()
			.map(url -> normalizeAndResolveGuildGalleryImageUrl(actorUserId, guildId, url))
			.toList();
		if(resolved.isEmpty()){
			throw new RuntimeException("imageUrls is required.");
		}
		return resolved;
	}

	/**
	 * 저장 문자열에서 이미지 URL 목록을 파싱합니다.
	 *
	 * @param storedImageUrls 저장된 URL 문자열
	 * @return URL 목록
	 */
	private List<String> parseStoredImageUrls(String storedImageUrls){
		List<String> resolved = new ArrayList<>();
		if(storedImageUrls != null && !storedImageUrls.isBlank()){
			Arrays.stream(storedImageUrls.split("\\R"))
				.map(String::trim)
				.filter(value -> !value.isEmpty())
				.distinct()
				.forEach(resolved::add);
		}
		return resolved;
	}

	/**
	 * 이미지 URL 목록을 저장 문자열로 직렬화합니다.
	 *
	 * @param imageUrls URL 목록
	 * @return 직렬화 문자열
	 */
	private String serializeImageUrls(List<String> imageUrls){
		if(imageUrls == null || imageUrls.isEmpty()){
			return null;
		}
		return String.join("\n", imageUrls);
	}

	/**
	 * 동일 길드 내 멤버명 중복 여부를 검증합니다.
	 *
	 * @param guildId 길드 ID
	 * @param memberName 멤버명
	 * @param currentMemberId 현재 멤버십 ID(수정 시)
	 */
	private void ensureMemberNameNotDuplicated(Long guildId, String memberName, Long currentMemberId){
		userGuildRepository.findFirstByGuild_GuildIdAndMemberNameIgnoreCaseAndDeletedAtIsNull(guildId, memberName)
			.ifPresent(existing -> {
				if(currentMemberId == null || !existing.getId().equals(currentMemberId)){
					throw new RuntimeException("동일한 닉네임의 멤버가 이미 존재합니다.");
				}
			});
	}

	/**
	 * 길드 엔티티를 DTO로 변환합니다.
	 *
	 * @param guild 길드 엔티티
	 * @return 길드 DTO
	 */
	private UserGuildDto toGuildDto(UserGuild guild){
		return toGuildDto(guild, null);
	}

	/**
	 * 길드장 표시명을 포함해 길드 DTO로 변환합니다.
	 *
	 * @param guild 길드 엔티티
	 * @param resolvedMasterName 미리 계산된 길드장명
	 * @return 길드 DTO
	 */
	private UserGuildDto toGuildDto(UserGuild guild, String resolvedMasterName){
		UserGuildDto dto = UserGuildDto.fromEntity(guild);
		String masterName = normalizeOptional(resolvedMasterName);
		if(masterName == null){
			masterName = resolveGuildMasterName(guild.getGuildId(), guild.getGuildName());
		}
		if(masterName == null && guild.getOwner() != null){
			masterName = normalizeOptional(guild.getOwner().getNickname());
		}
		dto.setMasterMemberName(masterName);
		return dto;
	}

	/**
	 * 길드 ID 목록의 길드장 표시명을 일괄 조회합니다.
	 *
	 * @param guildIds 길드 ID 목록
	 * @return 길드장명 맵
	 */
	private Map<Long, String> resolveGuildMasterNamesByGuildIds(List<Long> guildIds){
		if(guildIds == null || guildIds.isEmpty()){
			return Map.of();
		}
		List<Long> normalizedGuildIds = guildIds.stream()
			.filter(guildId -> guildId != null)
			.distinct()
			.toList();
		if(normalizedGuildIds.isEmpty()){
			return Map.of();
		}
		Map<Long, String> masterNamesByGuildId = new HashMap<>();
		List<UserGuildMember> masterRows = userGuildRepository
			.findByGuild_GuildIdInAndGuildRoleAndMemberStatusAndDeletedAtIsNullOrderByGuild_GuildIdAscMemberNameAsc(
				normalizedGuildIds,
				ROLE_MASTER,
				MEMBER_STATUS_APPROVED
			);
		for(UserGuildMember member : masterRows){
			if(member.getGuild() == null || member.getGuild().getGuildId() == null){
				continue;
			}
			Long guildId = member.getGuild().getGuildId();
			if(masterNamesByGuildId.containsKey(guildId)){
				continue;
			}
			String displayName = resolveMasterDisplayName(member);
			if(displayName != null && !displayName.isBlank()){
				masterNamesByGuildId.put(guildId, displayName);
			}
		}
		return masterNamesByGuildId;
	}

	/**
	 * 길드 갤러리 엔티티를 DTO로 변환합니다.
	 *
	 * @param entity 갤러리 엔티티
	 * @return 갤러리 DTO
	 */
	private GuildGalleryImageDto toGuildGalleryImageDto(UserGuildGalleryImage entity){
		return GuildGalleryImageDto.fromEntity(entity);
	}

	/**
	 * 길드 게시글 엔티티를 DTO로 변환합니다.
	 *
	 * @param entity 게시글 엔티티
	 * @return 게시글 DTO
	 */
	private GuildBoardPostDto toGuildBoardPostDto(UserGuildBoardPost entity){
		return GuildBoardPostDto.fromEntity(entity);
	}

	/**
	 * 길드 게시판 카테고리 엔티티를 DTO로 변환합니다.
	 *
	 * @param entity 카테고리 엔티티
	 * @return 카테고리 DTO
	 */
	private GuildBoardCategoryDto toGuildBoardCategoryDto(UserGuildBoardCategory entity){
		return GuildBoardCategoryDto.fromEntity(entity);
	}

	/**
	 * 길드장 표시명을 단건 조회합니다.
	 *
	 * @param guildId 길드 ID
	 * @param guildName 길드명
	 * @return 길드장 표시명
	 */
	private String resolveGuildMasterName(Long guildId, String guildName){
		if(guildId != null){
			String byGuildId = userGuildRepository.findByGuild_GuildIdAndDeletedAtIsNullOrderByGuildRoleDescMemberNameAsc(guildId)
				.stream()
				.filter(member -> member.getGuildRole() != null && member.getGuildRole() == ROLE_MASTER)
				.map(this::resolveMasterDisplayName)
				.filter(name -> name != null && !name.isBlank())
				.findFirst()
				.orElse(null);
			if(byGuildId != null){
				return byGuildId;
			}
		}
		String normalizedGuildName = normalizeOptional(guildName);
		if(normalizedGuildName == null){
			return null;
		}
		return userGuildRepository.findByGuildNameIgnoreCaseAndDeletedAtIsNullOrderByGuildRoleDescMemberNameAsc(normalizedGuildName)
			.stream()
			.filter(member -> member.getGuildRole() != null && member.getGuildRole() == ROLE_MASTER)
			.map(this::resolveMasterDisplayName)
			.filter(name -> name != null && !name.isBlank())
			.findFirst()
			.orElse(null);
	}

	/**
	 * 멤버 엔티티에서 표시명을 계산합니다.
	 *
	 * @param member 길드 멤버 엔티티
	 * @return 표시명
	 */
	private String resolveMasterDisplayName(UserGuildMember member){
		String memberName = normalizeOptional(member.getMemberName());
		if(memberName != null){
			return memberName;
		}
		if(member.getUser() != null){
			return normalizeOptional(member.getUser().getNickname());
		}
		return null;
	}

	/**
	 * 랭크 정보 없이 멤버 DTO로 변환합니다.
	 *
	 * @param entity 멤버 엔티티
	 * @return 멤버 DTO
	 */
	private UserGuildMemberDto toGuildMemberDtoWithoutRank(UserGuildMember entity){
		UserGuildMemberDto dto = UserGuildMemberDto.fromEntity(entity);
		if(dto.getGuildRole() == null){
			dto.setGuildRole(ROLE_MEMBER);
		}
		return dto;
	}

	/**
	 * 멤버 엔티티를 DTO로 변환합니다.
	 *
	 * @param entity 멤버 엔티티
	 * @return 멤버 DTO
	 */
	private UserGuildMemberDto toGuildMemberDto(UserGuildMember entity){
		return toGuildMemberDto(entity, null);
	}

	/**
	 * 랭크 인덱스를 활용해 멤버 DTO를 변환합니다.
	 *
	 * @param entity 멤버 엔티티
	 * @param rankIndex 랭크 인덱스
	 * @return 멤버 DTO
	 */
	private UserGuildMemberDto toGuildMemberDto(UserGuildMember entity, GuildMemberRankIndex rankIndex){
		UserGuildMemberDto dto = toGuildMemberDtoWithoutRank(entity);
		Integer serverId = entity.getServerId();
		String memberName = normalizeOptional(entity.getMemberName());
		if(serverId == null || memberName == null){
			return dto;
		}
		UserRank rank = rankIndex != null
			? resolveGuildMemberRankFromIndex(rankIndex, serverId, memberName)
			: userRankRepository.findLatestActiveByServerIdAndUserNameRobust(serverId, memberName).orElse(null);
		if(rank != null){
			dto.setUserPower(rank.getUserPower());
			dto.setUserVitality(rank.getUserVitality());
			dto.setUserAttractiveness(rank.getUserAttractiveness());
			dto.setRankUpdatedAt(rank.getUpdatedAt());
		}
		return dto;
	}

	/**
	 * 길드 멤버 랭크 조회용 인덱스를 구성합니다.
	 *
	 * @param members 길드 멤버 목록
	 * @return 정규화/공백제거 인덱스
	 */
	private GuildMemberRankIndex buildGuildMemberRankIndex(List<UserGuildMember> members){
		if(members == null || members.isEmpty()){
			return new GuildMemberRankIndex(Map.of(), Map.of());
		}

		Map<Integer, Set<String>> normalizedLookupNamesByServer = new HashMap<>();
		for(UserGuildMember member : members){
			GuildMemberRankLookupKey normalizedKey = toNormalizedRankLookupKey(member.getServerId(), member.getMemberName());
			if(normalizedKey == null){
				continue;
			}
			normalizedLookupNamesByServer
				.computeIfAbsent(normalizedKey.serverId(), ignored -> new HashSet<>())
				.add(normalizedKey.memberName());
		}

		Map<GuildMemberRankLookupKey, UserRank> normalizedRanks = new HashMap<>();
		Map<GuildMemberRankLookupKey, UserRank> compactRanks = new HashMap<>();
		for(Map.Entry<Integer, Set<String>> entry : normalizedLookupNamesByServer.entrySet()){
			Integer serverId = entry.getKey();
			List<String> normalizedNames = entry.getValue().stream().toList();
			if(normalizedNames.isEmpty()){
				continue;
			}
			List<UserRank> candidates = userRankRepository.findByServerIdAndNormalizedUserNameIn(serverId, normalizedNames);
			for(UserRank candidate : candidates){
				GuildMemberRankLookupKey normalizedKey = toNormalizedRankLookupKey(serverId, candidate.getUserName());
				if(normalizedKey == null){
					continue;
				}
				normalizedRanks.merge(normalizedKey, candidate, this::pickPreferredRank);
				String compactName = compactLookupMemberName(normalizedKey.memberName());
				if(compactName != null){
					compactRanks.merge(new GuildMemberRankLookupKey(serverId, compactName), candidate, this::pickPreferredRank);
				}
			}
		}

		Map<Integer, Set<String>> unresolvedCompactLookupNamesByServer = new HashMap<>();
		for(UserGuildMember member : members){
			GuildMemberRankLookupKey normalizedKey = toNormalizedRankLookupKey(member.getServerId(), member.getMemberName());
			if(normalizedKey == null || normalizedRanks.containsKey(normalizedKey)){
				continue;
			}
			String compactName = compactLookupMemberName(normalizedKey.memberName());
			if(compactName == null){
				continue;
			}
			unresolvedCompactLookupNamesByServer
				.computeIfAbsent(normalizedKey.serverId(), ignored -> new HashSet<>())
				.add(compactName);
		}
		for(Map.Entry<Integer, Set<String>> entry : unresolvedCompactLookupNamesByServer.entrySet()){
			Integer serverId = entry.getKey();
			List<String> compactNames = entry.getValue().stream().toList();
			if(compactNames.isEmpty()){
				continue;
			}
			List<UserRank> candidates = userRankRepository.findByServerIdAndCompactUserNameIn(serverId, compactNames);
			for(UserRank candidate : candidates){
				String compactName = compactLookupMemberName(candidate.getUserName());
				if(compactName == null){
					continue;
				}
				compactRanks.merge(new GuildMemberRankLookupKey(serverId, compactName), candidate, this::pickPreferredRank);
			}
		}

		return new GuildMemberRankIndex(normalizedRanks, compactRanks);
	}

	/**
	 * 인덱스에서 멤버 랭크를 조회합니다.
	 *
	 * @param rankIndex 랭크 인덱스
	 * @param serverId 서버 ID
	 * @param memberName 멤버명
	 * @return 조회된 랭크 엔티티
	 */
	private UserRank resolveGuildMemberRankFromIndex(GuildMemberRankIndex rankIndex, Integer serverId, String memberName){
		GuildMemberRankLookupKey normalizedKey = toNormalizedRankLookupKey(serverId, memberName);
		if(normalizedKey == null){
			return null;
		}
		UserRank byNormalized = rankIndex.normalized().get(normalizedKey);
		if(byNormalized != null){
			return byNormalized;
		}
		String compactName = compactLookupMemberName(normalizedKey.memberName());
		if(compactName == null){
			return null;
		}
		return rankIndex.compact().get(new GuildMemberRankLookupKey(serverId, compactName));
	}

	/**
	 * 서버/멤버명 조합을 정규화된 랭크 조회 키로 변환합니다.
	 */
	private GuildMemberRankLookupKey toNormalizedRankLookupKey(Integer serverId, String memberName){
		String normalizedName = normalizeLookupMemberName(memberName);
		if(serverId == null || normalizedName == null){
			return null;
		}
		return new GuildMemberRankLookupKey(serverId, normalizedName);
	}

	/**
	 * 랭크 조회용 멤버명을 소문자 기준으로 정규화합니다.
	 */
	private String normalizeLookupMemberName(String memberName){
		String normalized = normalizeOptional(memberName);
		if(normalized == null){
			return null;
		}
		return normalized.toLowerCase(Locale.ROOT);
	}

	/**
	 * 공백 제거 기반의 멤버명 조회 키를 생성합니다.
	 */
	private String compactLookupMemberName(String memberName){
		String normalized = normalizeLookupMemberName(memberName);
		if(normalized == null){
			return null;
		}
		return normalized.replaceAll("\\s+", "");
	}

	/**
	 * 두 랭크 후보 중 우선순위가 높은 엔티티를 선택합니다.
	 */
	private UserRank pickPreferredRank(UserRank left, UserRank right){
		if(left == null){
			return right;
		}
		if(right == null){
			return left;
		}
		boolean leftIsPrimaryClass = left.getClassId() != null && left.getClassId() == 0;
		boolean rightIsPrimaryClass = right.getClassId() != null && right.getClassId() == 0;
		if(leftIsPrimaryClass != rightIsPrimaryClass){
			return leftIsPrimaryClass ? left : right;
		}
		LocalDateTime leftUpdatedAt = left.getUpdatedAt();
		LocalDateTime rightUpdatedAt = right.getUpdatedAt();
		if(leftUpdatedAt == null){
			return rightUpdatedAt == null ? left : right;
		}
		if(rightUpdatedAt == null){
			return left;
		}
		return rightUpdatedAt.isAfter(leftUpdatedAt) ? right : left;
	}

	/**
	 * 삭제되지 않은 활성 사용자 엔티티를 조회합니다.
	 */
	private User getActiveUser(Long userId){
		return userRepository.findByUserIdAndDeletedAtIsNull(userId)
			.orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
	}

	/**
	 * 관리자 여부를 판별합니다.
	 */
	private boolean isAdmin(User user){
		return Boolean.TRUE.equals(user.getIsAdmin());
	}

	/**
	 * 관리자 권한을 검증합니다.
	 */
	private void ensureAdmin(User user){
		if(!isAdmin(user)){
			throw new RuntimeException("관리자 권한이 필요합니다.");
		}
	}

	/**
	 * 필수 문자열 값을 정규화하고 누락 여부를 검증합니다.
	 */
	private String normalizeRequired(String value, String fieldName){
		String normalized = normalizeOptional(value);
		if(normalized == null || normalized.isBlank()){
			throw new RuntimeException(fieldName + " is required.");
		}
		return normalized;
	}

	/**
	 * 길드 소개글에서 위험/불필요한 마크업을 제거합니다.
	 */
	private String normalizeGuildDescription(String value){
		String normalized = normalizeOptional(value);
		if(normalized == null){
			return null;
		}
		String cleaned = normalized
			.replaceAll("(?is)<script[\\s\\S]*?</script>", " ")
			.replaceAll("(?is)<style[\\s\\S]*?</style>", " ")
			.replaceAll("(?is)<!--.*?-->", " ")
			.replaceAll("(?is)<[^>]+>", " ")
			.replaceAll("(?i)Some events are deferred to the next run because of content length limits\\.", " ")
			.replaceAll("\\s+", " ")
			.trim();
		return cleaned.isEmpty() ? null : cleaned;
	}

	/**
	 * 선택 문자열 값을 trim 후 비어 있으면 null로 변환합니다.
	 */
	private String normalizeOptional(String value){
		if(value == null){
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	/**
	 * 리스트 조회 limit를 검증하고 상한을 적용합니다.
	 */
	private Integer normalizeListLimit(Integer limit, int maxLimit){
		if(limit == null){
			return null;
		}
		if(limit <= 0){
			throw new RuntimeException("limit must be greater than 0.");
		}
		return Math.min(limit, maxLimit);
	}

	/**
	 * 길드 레벨 범위를 검증합니다.
	 */
	private Integer validateGuildLevel(Integer level, String fieldName){
		if(level == null){
			throw new RuntimeException(fieldName + " is required.");
		}
		if(level < 0 || level > 999){
			throw new RuntimeException(fieldName + " must be between 0 and 999.");
		}
		return level;
	}

	/**
	 * 서버 ID 범위를 검증합니다.
	 */
	private Integer validateServerId(Integer serverId, String fieldName){
		if(serverId == null || serverId < 1 || serverId > 7){
			throw new RuntimeException(fieldName + " must be a server ID between 1 and 7.");
		}
		return serverId;
	}
}

