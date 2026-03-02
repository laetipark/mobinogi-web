package com.example.mobinogi.repository;

import com.example.mobinogi.entity.guild.UserGuildBoardCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GuildBoardCategoryRepository extends JpaRepository<UserGuildBoardCategory, Long>{

	List<UserGuildBoardCategory> findByGuild_GuildIdAndDeletedAtIsNullOrderBySortOrderAscCreatedAtAsc(Long guildId);

	Optional<UserGuildBoardCategory> findByIdAndDeletedAtIsNull(Long id);

	Optional<UserGuildBoardCategory> findFirstByGuild_GuildIdAndNameIgnoreCaseAndDeletedAtIsNull(Long guildId, String name);
}


