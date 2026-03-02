package com.example.mobinogi.repository;

import com.example.mobinogi.entity.UserGuild;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GuildRepository extends JpaRepository<UserGuild, Long>{

	Optional<UserGuild> findByGuildIdAndDeletedAtIsNull(Long guildId);

	List<UserGuild> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(String status);

	List<UserGuild> findByOwner_UserIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long ownerUserId);

	boolean existsByGuildNameIgnoreCaseAndDeletedAtIsNull(String guildName);

	boolean existsByOwner_UserIdAndStatusInAndDeletedAtIsNull(Long ownerUserId, List<String> statuses);
}
