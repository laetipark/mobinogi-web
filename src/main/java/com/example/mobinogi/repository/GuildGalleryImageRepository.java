package com.example.mobinogi.repository;

import com.example.mobinogi.entity.guild.UserGuildGalleryImage;
import java.time.LocalDateTime;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GuildGalleryImageRepository extends JpaRepository<UserGuildGalleryImage, Long>{

	List<UserGuildGalleryImage> findByGuild_GuildIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long guildId);

	List<UserGuildGalleryImage> findByGuild_GuildIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long guildId, Pageable pageable);

	Optional<UserGuildGalleryImage> findByIdAndDeletedAtIsNull(Long id);

	/**
	 * 삭제된 길드 갤러리 항목 중 기준 시각 이전(포함) 항목을 오래된 순으로 조회합니다.
	 *
	 * @param threshold 삭제 보존 만료 기준 시각
	 * @param pageable 조회 배치 조건
	 * @return 보존 만료 길드 갤러리 목록
	 */
	List<UserGuildGalleryImage> findByDeletedAtIsNotNullAndDeletedAtLessThanEqualOrderByDeletedAtAsc(
		LocalDateTime threshold,
		Pageable pageable
	);

	/**
	 * 갤러리 ID 목록 기준으로 하드 삭제합니다.
	 *
	 * @param ids 삭제 대상 ID 목록
	 */
	void deleteByIdIn(List<Long> ids);
}
