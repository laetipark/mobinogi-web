package com.example.mobinogi.repository;

import com.example.mobinogi.entity.guild.UserGuildBoardPost;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GuildBoardPostRepository extends JpaRepository<UserGuildBoardPost, Long>{

	List<UserGuildBoardPost> findByGuild_GuildIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long guildId);

	List<UserGuildBoardPost> findByGuild_GuildIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long guildId, Pageable pageable);

	List<UserGuildBoardPost> findByCategory_IdAndDeletedAtIsNullOrderByCreatedAtDesc(Long categoryId);

	Optional<UserGuildBoardPost> findByIdAndDeletedAtIsNull(Long id);
}

