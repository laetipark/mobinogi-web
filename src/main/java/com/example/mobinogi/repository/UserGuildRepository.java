package com.example.mobinogi.repository;

import com.example.mobinogi.entity.UserGuildMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserGuildRepository extends JpaRepository<UserGuildMember, Long> {

    List<UserGuildMember> findByMemberNameContaining(String memberName);

    List<UserGuildMember> findByClassName(String className);

    List<UserGuildMember> findByClassType(String classType);

    @Query("SELECT u FROM UserGuildMember u ORDER BY u.contributionStart DESC LIMIT :limit")
    List<UserGuildMember> findTopByContributionStart(@Param("limit") int limit);

    @Query("SELECT u FROM UserGuildMember u ORDER BY u.contributionFinish DESC LIMIT :limit")
    List<UserGuildMember> findTopByContributionFinish(@Param("limit") int limit);

    @Query("SELECT u FROM UserGuildMember u ORDER BY u.contributionChanged DESC LIMIT :limit")
    List<UserGuildMember> findTopByContributionChanged(@Param("limit") int limit);

    List<UserGuildMember> findByUpdatedAtAfter(LocalDateTime dateTime);

    Optional<UserGuildMember> findByMemberName(String memberName);

    Optional<UserGuildMember> findTopByOrderByUpdatedAtDesc();

    List<UserGuildMember> findBySubCharacterContaining(String subCharacter);

    @Query("SELECT u FROM UserGuildMember u WHERE u.contributionFinish BETWEEN :minContribution AND :maxContribution")
    List<UserGuildMember> findByContributionFinishBetween(@Param("minContribution") Integer minContribution,
                                                          @Param("maxContribution") Integer maxContribution);

    Optional<UserGuildMember> findByIdAndDeletedAtIsNull(Long id);

    List<UserGuildMember> findByGuild_GuildIdAndDeletedAtIsNullOrderByGuildRoleDescMemberNameAsc(Long guildId);

    List<UserGuildMember> findByGuild_GuildIdAndMemberStatusAndDeletedAtIsNullOrderByCreatedAtAsc(Long guildId, String memberStatus);

    Optional<UserGuildMember> findByGuild_GuildIdAndUser_UserIdAndDeletedAtIsNull(Long guildId, Long userId);

    Optional<UserGuildMember> findFirstByGuild_GuildIdAndMemberNameIgnoreCaseAndDeletedAtIsNull(Long guildId, String memberName);

    Optional<UserGuildMember> findFirstByUser_UserIdAndMemberStatusAndDeletedAtIsNullOrderByUpdatedAtDesc(Long userId, String memberStatus);

    List<UserGuildMember> findByUser_UserIdAndMemberStatusAndDeletedAtIsNullOrderByCreatedAtDesc(Long userId, String memberStatus);

    boolean existsByGuild_GuildIdAndUser_UserIdAndMemberStatusAndDeletedAtIsNull(Long guildId, Long userId, String memberStatus);

    boolean existsByUser_UserIdAndMemberStatusAndDeletedAtIsNull(Long userId, String memberStatus);
}
