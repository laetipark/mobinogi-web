package com.example.mobinogi.service.user;

import com.example.mobinogi.dto.user.*;
import com.example.mobinogi.entity.User;
import com.example.mobinogi.entity.UserGuild;
import com.example.mobinogi.entity.UserGuildMember;
import com.example.mobinogi.repository.GuildRepository;
import com.example.mobinogi.repository.UserGuildRepository;
import com.example.mobinogi.repository.UserRankRepository;
import com.example.mobinogi.repository.UserRepository;
import com.example.mobinogi.service.rank.RankApiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GuildManagementService{

	private static final String GUILD_STATUS_PENDING = "PENDING";
	private static final String GUILD_STATUS_APPROVED = "APPROVED";
	private static final String GUILD_STATUS_REJECTED = "REJECTED";
	private static final String MEMBER_STATUS_PENDING = "PENDING";
	private static final String MEMBER_STATUS_APPROVED = "APPROVED";
	private static final String MEMBER_STATUS_REJECTED = "REJECTED";
	private static final int ROLE_MEMBER = 0;
	private static final int ROLE_SUBMASTER = 1;
	private static final int ROLE_MASTER = 2;
	private static final String RANK_REFRESH_STATUS_KEY_PREFIX = "guild:rank-refresh:status:";
	private static final String RANK_REFRESH_STATUS_IDLE = "IDLE";
	private static final String RANK_REFRESH_STATUS_RUNNING = "RUNNING";
	private static final String RANK_REFRESH_STATUS_COMPLETED = "COMPLETED";
	private static final String RANK_REFRESH_STATUS_FAILED = "FAILED";

	private final GuildRepository guildRepository;
	private final UserRepository userRepository;
	private final UserGuildRepository userGuildRepository;
	private final UserRankRepository userRankRepository;
	private final RankApiService rankApiService;
	private final RedisTemplate<String, Object> redisTemplate;

	@Value("${guild.refresh.status.ttl-seconds:3600}")
	private long guildRefreshStatusTtlSeconds;

	@Value("${guild.refresh.status.backend-redis-enabled:false}")
	private boolean guildRefreshStatusBackendRedisEnabled;

	public GuildDashboardDto getDashboard(Long userId){
		User actor = getActiveUser(userId);
		boolean isAdmin = isAdmin(actor);

		List<UserGuildDto> ownedGuildRequests = guildRepository
			.findByOwner_UserIdAndDeletedAtIsNullOrderByCreatedAtDesc(userId)
			.stream()
			.map(UserGuildDto::fromEntity)
			.toList();

		List<UserGuildDto> approvedGuilds = guildRepository
			.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(GUILD_STATUS_APPROVED)
			.stream()
			.map(UserGuildDto::fromEntity)
			.toList();

		List<UserGuildDto> adminPendingGuilds = isAdmin
			? guildRepository.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(GUILD_STATUS_PENDING)
				.stream()
				.map(UserGuildDto::fromEntity)
				.toList()
			: List.of();

		UserGuildDto myApprovedGuild = null;
		UserGuildMemberDto myMembership = null;
		boolean canManageMembers = false;
		List<UserGuildMemberDto> guildMembers = List.of();
		List<UserGuildMemberDto> pendingGuildMembers = List.of();

		var membershipOpt = userGuildRepository.findFirstByUser_UserIdAndMemberStatusAndDeletedAtIsNullOrderByUpdatedAtDesc(
			userId,
			MEMBER_STATUS_APPROVED
		);
		if(membershipOpt.isPresent() && membershipOpt.get().getGuild() != null){
			UserGuildMember membership = membershipOpt.get();
			UserGuild guild = membership.getGuild();
			myApprovedGuild = UserGuildDto.fromEntity(guild);
			myMembership = toGuildMemberDto(membership);
			canManageMembers = canManageGuildMembers(actor, guild);

			List<UserGuildMember> allGuildRows = userGuildRepository.findByGuild_GuildIdAndDeletedAtIsNullOrderByGuildRoleDescMemberNameAsc(
				guild.getGuildId()
			);
			guildMembers = allGuildRows.stream()
				.map(this::toGuildMemberDto)
				.toList();
			if(canManageMembers){
				pendingGuildMembers = allGuildRows.stream()
					.filter(row -> MEMBER_STATUS_PENDING.equalsIgnoreCase(row.getMemberStatus()))
					.map(this::toGuildMemberDto)
					.toList();
			}
		}

		List<UserGuildMemberDto> myPendingJoinRequests = userGuildRepository
			.findByUser_UserIdAndMemberStatusAndDeletedAtIsNullOrderByCreatedAtDesc(userId, MEMBER_STATUS_PENDING)
			.stream()
			.map(this::toGuildMemberDto)
			.toList();

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

	@Transactional
	public UserGuildDto registerGuild(Long userId, GuildRegisterRequest request){
		User actor = getActiveUser(userId);
		String guildName = normalizeRequired(request.getGuildName(), "guildName");
		String description = normalizeOptional(request.getDescription());
		Integer serverId = validateServerId(request.getServerId(), "serverId");

		if(guildRepository.existsByGuildNameIgnoreCaseAndDeletedAtIsNull(guildName)){
			throw new RuntimeException("?대? 議댁옱?섎뒗 湲몃뱶紐낆엯?덈떎.");
		}

		boolean hasOwnedGuild = guildRepository.existsByOwner_UserIdAndStatusInAndDeletedAtIsNull(
			userId,
			List.of(GUILD_STATUS_PENDING, GUILD_STATUS_APPROVED)
		);
		if(hasOwnedGuild){
			throw new RuntimeException("?대? ?깅줉?덇굅???뱀씤??湲몃뱶媛 ?덉뒿?덈떎.");
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
		return UserGuildDto.fromEntity(created);
	}

	@Transactional
	public UserGuildDto updateGuildDescription(Long actorUserId, String description){
		User actor = getActiveUser(actorUserId);
		UserGuild guild = resolveManageableGuild(actor);
		String normalizedDescription = normalizeOptional(description);
		if(normalizedDescription != null && normalizedDescription.length() > 500){
			throw new RuntimeException("길드 소개는 500자 이하로 입력해 주세요.");
		}
		guild.setDescription(normalizedDescription);
		return UserGuildDto.fromEntity(guildRepository.save(guild));
	}

	@Transactional
	public UserGuildMemberDto requestJoinGuild(Long userId, GuildJoinRequest request){
		User actor = getActiveUser(userId);
		Long guildId = request.getGuildId();
		if(guildId == null){
			throw new RuntimeException("guildId???꾩닔?낅땲??");
		}
		UserGuild guild = guildRepository.findByGuildIdAndDeletedAtIsNull(guildId)
			.orElseThrow(() -> new RuntimeException("湲몃뱶瑜?李얠쓣 ???놁뒿?덈떎."));
		if(!GUILD_STATUS_APPROVED.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("?뱀씤??湲몃뱶?먮쭔 媛???붿껌?????덉뒿?덈떎.");
		}
		if(userGuildRepository.existsByUser_UserIdAndMemberStatusAndDeletedAtIsNull(userId, MEMBER_STATUS_APPROVED)){
			throw new RuntimeException("?대? ?뱀씤??湲몃뱶??媛?낅릺???덉뒿?덈떎.");
		}
		if(userGuildRepository.existsByGuild_GuildIdAndUser_UserIdAndMemberStatusAndDeletedAtIsNull(guildId, userId, MEMBER_STATUS_PENDING)){
			throw new RuntimeException("?대? 媛???뱀씤 ?湲?以묒엯?덈떎.");
		}
		if(userGuildRepository.existsByGuild_GuildIdAndUser_UserIdAndMemberStatusAndDeletedAtIsNull(guildId, userId, MEMBER_STATUS_APPROVED)){
			throw new RuntimeException("?대? 媛?낅맂 湲몃뱶?먯엯?덈떎.");
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

	@Transactional
	public UserGuildMemberDto approveMember(Long actorUserId, Long memberId){
		User actor = getActiveUser(actorUserId);
		UserGuildMember target = userGuildRepository.findByIdAndDeletedAtIsNull(memberId)
			.orElseThrow(() -> new RuntimeException("湲몃뱶?먯쓣 李얠쓣 ???놁뒿?덈떎."));
		UserGuild guild = requireGuild(target);
		if(!canManageGuildMembers(actor, guild)){
			throw new RuntimeException("湲몃뱶???뱀씤 沅뚰븳???놁뒿?덈떎.");
		}
		if(!MEMBER_STATUS_PENDING.equalsIgnoreCase(target.getMemberStatus())){
			throw new RuntimeException("?湲?以묒씤 湲몃뱶?먮쭔 ?뱀씤?????덉뒿?덈떎.");
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

	@Transactional
	public UserGuildMemberDto rejectMember(Long actorUserId, Long memberId){
		User actor = getActiveUser(actorUserId);
		UserGuildMember target = userGuildRepository.findByIdAndDeletedAtIsNull(memberId)
			.orElseThrow(() -> new RuntimeException("湲몃뱶?먯쓣 李얠쓣 ???놁뒿?덈떎."));
		UserGuild guild = requireGuild(target);
		if(!canManageGuildMembers(actor, guild)){
			throw new RuntimeException("湲몃뱶??諛섎젮 沅뚰븳???놁뒿?덈떎.");
		}
		if(!MEMBER_STATUS_PENDING.equalsIgnoreCase(target.getMemberStatus())){
			throw new RuntimeException("?湲?以묒씤 湲몃뱶?먮쭔 諛섎젮?????덉뒿?덈떎.");
		}
		target.setMemberStatus(MEMBER_STATUS_REJECTED);
		target.setApprovedByUserId(actorUserId);
		target.setApprovedAt(LocalDateTime.now());
		return toGuildMemberDto(userGuildRepository.save(target));
	}

	@Transactional
	public UserGuildMemberDto updateMemberRole(Long actorUserId, Long memberId, Integer guildRole){
		if(guildRole == null || guildRole < ROLE_MEMBER || guildRole > ROLE_MASTER){
			throw new RuntimeException("guildRole? 0~2 踰붿쐞?ъ빞 ?⑸땲??");
		}
		User actor = getActiveUser(actorUserId);
		UserGuildMember target = userGuildRepository.findByIdAndDeletedAtIsNull(memberId)
			.orElseThrow(() -> new RuntimeException("湲몃뱶?먯쓣 李얠쓣 ???놁뒿?덈떎."));
		UserGuild guild = requireGuild(target);
		if(!canChangeGuildRole(actor, guild)){
			throw new RuntimeException("湲몃뱶 ??븷 蹂寃?沅뚰븳???놁뒿?덈떎.");
		}
		if(target.getUser() != null
			&& guild.getOwner() != null
			&& target.getUser().getUserId().equals(guild.getOwner().getUserId())
			&& !isAdmin(actor)
			&& guildRole < ROLE_MASTER){
			throw new RuntimeException("湲몃뱶 ?깅줉?먯쓽 ??븷? 留덉뒪??2)濡??좎??댁빞 ?⑸땲??");
		}
		target.setGuildRole(guildRole);
		return toGuildMemberDto(userGuildRepository.save(target));
	}

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

	@Transactional
	public UserGuildMemberDto updateMemberInfo(Long actorUserId, Long memberId, GuildMemberManageRequest request){
		User actor = getActiveUser(actorUserId);
		UserGuildMember target = userGuildRepository.findByIdAndDeletedAtIsNull(memberId)
			.orElseThrow(() -> new RuntimeException("湲몃뱶?먯쓣 李얠쓣 ???놁뒿?덈떎."));
		UserGuild guild = requireGuild(target);
		if(!canManageGuildMembers(actor, guild)){
			throw new RuntimeException("湲몃뱶?먯젙蹂?愿由?沅뚰븳???놁뒿?덈떎.");
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

	@Transactional
	public void deleteMember(Long actorUserId, Long memberId){
		User actor = getActiveUser(actorUserId);
		UserGuildMember target = userGuildRepository.findByIdAndDeletedAtIsNull(memberId)
			.orElseThrow(() -> new RuntimeException("湲몃뱶?먯쓣 李얠쓣 ???놁뒿?덈떎."));
		UserGuild guild = requireGuild(target);
		if(!canManageGuildMembers(actor, guild)){
			throw new RuntimeException("湲몃뱶?먯젙蹂?愿由?沅뚰븳???놁뒿?덈떎.");
		}
		if(target.getUser() != null
			&& guild.getOwner() != null
			&& target.getUser().getUserId().equals(guild.getOwner().getUserId())
			&& !isAdmin(actor)){
			throw new RuntimeException("湲몃뱶 留덉뒪?곗쓣 ??젣?????덉뒿?덈떎.");
		}

		target.setDeletedAt(LocalDateTime.now());
		userGuildRepository.save(target);
	}

	@Transactional
	public GuildMemberRankRefreshSummaryDto refreshMemberRanks(
		Long actorUserId,
		List<GuildMemberRankRefreshTargetRequest> requestedTargets
	){
		User actor = getActiveUser(actorUserId);
		UserGuildMember membership = resolveApprovedMembership(actor);
		UserGuild guild = requireGuild(membership);
		if(!GUILD_STATUS_APPROVED.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("승인된 길드가 아닙니다.");
		}
		boolean canManageMembers = canManageGuildMembers(actor, guild);
		List<GuildMemberRankRefreshTargetRequest> effectiveRequestedTargets = requestedTargets;
		if(!canManageMembers){
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
			throw new RuntimeException("이미 길드원 정보 갱신이 진행 중입니다.");
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

	public GuildMemberRankRefreshStatusDto getMemberRankRefreshStatus(Long actorUserId){
		User actor = getActiveUser(actorUserId);
		UserGuildMember membership = resolveApprovedMembership(actor);
		UserGuild guild = requireGuild(membership);
		if(!GUILD_STATUS_APPROVED.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("승인된 길드가 아닙니다.");
		}
		return resolveRankRefreshStatus(guild.getGuildId());
	}

	@Transactional
	public UserGuildDto approveGuild(Long adminUserId, Long guildId, String reviewNote){
		User admin = getActiveUser(adminUserId);
		ensureAdmin(admin);
		UserGuild guild = guildRepository.findByGuildIdAndDeletedAtIsNull(guildId)
			.orElseThrow(() -> new RuntimeException("湲몃뱶瑜?李얠쓣 ???놁뒿?덈떎."));
		if(!GUILD_STATUS_PENDING.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("?湲??곹깭 湲몃뱶留??뱀씤?????덉뒿?덈떎.");
		}
		guild.setStatus(GUILD_STATUS_APPROVED);
		guild.setReviewedBy(admin);
		guild.setReviewedAt(LocalDateTime.now());
		guild.setReviewNote(normalizeOptional(reviewNote));
		UserGuild approved = guildRepository.save(guild);

		createOrUpdateOwnerMembership(adminUserId, approved);
		return UserGuildDto.fromEntity(approved);
	}

	@Transactional
	public UserGuildDto rejectGuild(Long adminUserId, Long guildId, String reviewNote){
		User admin = getActiveUser(adminUserId);
		ensureAdmin(admin);
		UserGuild guild = guildRepository.findByGuildIdAndDeletedAtIsNull(guildId)
			.orElseThrow(() -> new RuntimeException("湲몃뱶瑜?李얠쓣 ???놁뒿?덈떎."));
		if(!GUILD_STATUS_PENDING.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("?湲??곹깭 湲몃뱶留?諛섎젮?????덉뒿?덈떎.");
		}
		guild.setStatus(GUILD_STATUS_REJECTED);
		guild.setReviewedBy(admin);
		guild.setReviewedAt(LocalDateTime.now());
		guild.setReviewNote(normalizeOptional(reviewNote));
		return UserGuildDto.fromEntity(guildRepository.save(guild));
	}

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

	private String buildRankRefreshStatusKey(Long guildId){
		return RANK_REFRESH_STATUS_KEY_PREFIX + guildId;
	}

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

	private String readString(Object value, String defaultValue){
		if(value == null){
			return defaultValue;
		}
		String normalized = String.valueOf(value);
		return normalized.isBlank() ? defaultValue : normalized;
	}

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

	private record RankRefreshTarget(String memberName, Integer serverId){
	}

	private UserGuild requireGuild(UserGuildMember member){
		if(member.getGuild() == null){
			throw new RuntimeException("湲몃뱶 ?뺣낫媛 ?녿뒗 ?곗씠?곗엯?덈떎.");
		}
		return member.getGuild();
	}

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

	private String resolveOwnerMemberName(User owner){
		String nickname = normalizeOptional(owner.getNickname());
		if(nickname != null && !nickname.isBlank()){
			return nickname;
		}
		return "owner-" + owner.getUserId();
	}

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

	private UserGuild resolveManageableGuild(User actor){
		UserGuildMember membership = resolveApprovedMembership(actor);
		UserGuild guild = requireGuild(membership);
		if(!canManageGuildMembers(actor, guild)){
			throw new RuntimeException("湲몃뱶?먯젙蹂?愿由?沅뚰븳???놁뒿?덈떎.");
		}
		if(!GUILD_STATUS_APPROVED.equalsIgnoreCase(guild.getStatus())){
			throw new RuntimeException("?뱀씤??湲몃뱶?먮쭔 愿由?????덉뒿?덈떎.");
		}
		return guild;
	}

	private UserGuildMember resolveApprovedMembership(User actor){
		return userGuildRepository
			.findFirstByUser_UserIdAndMemberStatusAndDeletedAtIsNullOrderByUpdatedAtDesc(actor.getUserId(), MEMBER_STATUS_APPROVED)
			.orElseThrow(() -> new RuntimeException("No approved guild membership."));
	}

	private Integer resolveMemberServerId(Integer candidateServerId, UserGuild guild){
		Integer serverId = candidateServerId != null ? candidateServerId : guild.getServerId();
		return validateServerId(serverId, "serverId");
	}

	private void ensureMemberNameNotDuplicated(Long guildId, String memberName, Long currentMemberId){
		userGuildRepository.findFirstByGuild_GuildIdAndMemberNameIgnoreCaseAndDeletedAtIsNull(guildId, memberName)
			.ifPresent(existing -> {
				if(currentMemberId == null || !existing.getId().equals(currentMemberId)){
					throw new RuntimeException("?대? 媛숈? ?대쫫???멤버媛 議댁옱?⑸땲??");
				}
			});
	}

	private UserGuildMemberDto toGuildMemberDto(UserGuildMember entity){
		UserGuildMemberDto dto = UserGuildMemberDto.fromEntity(entity);
		if(dto.getGuildRole() == null){
			dto.setGuildRole(ROLE_MEMBER);
		}
		String normalizedMemberName = entity.getMemberName() == null ? null : entity.getMemberName().trim();
		if(entity.getServerId() != null && normalizedMemberName != null && !normalizedMemberName.isBlank()){
			var rankOpt = userRankRepository.findLatestActiveByServerIdAndUserNameRobust(entity.getServerId(), normalizedMemberName);
			if(rankOpt.isPresent()){
				var rank = rankOpt.get();
				dto.setUserPower(rank.getUserPower());
				dto.setUserVitality(rank.getUserVitality());
				dto.setUserAttractiveness(rank.getUserAttractiveness());
				dto.setRankUpdatedAt(rank.getUpdatedAt());
			}
		}
		return dto;
	}

	private User getActiveUser(Long userId){
		return userRepository.findByUserIdAndDeletedAtIsNull(userId)
			.orElseThrow(() -> new RuntimeException("?ъ슜?먮? 李얠쓣 ???놁뒿?덈떎."));
	}

	private boolean isAdmin(User user){
		return Boolean.TRUE.equals(user.getIsAdmin());
	}

	private void ensureAdmin(User user){
		if(!isAdmin(user)){
			throw new RuntimeException("愿由ъ옄 沅뚰븳???꾩슂?⑸땲??");
		}
	}

	private String normalizeRequired(String value, String fieldName){
		String normalized = normalizeOptional(value);
		if(normalized == null || normalized.isBlank()){
			throw new RuntimeException(fieldName + "???꾩닔?낅땲??");
		}
		return normalized;
	}

	private String normalizeOptional(String value){
		if(value == null){
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private Integer validateServerId(Integer serverId, String fieldName){
		if(serverId == null || serverId < 1 || serverId > 7){
			throw new RuntimeException(fieldName + "는 1~7 범위의 서버 ID여야 합니다.");
		}
		return serverId;
	}
}
