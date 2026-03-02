package com.example.mobinogi.repository;

import com.example.mobinogi.entity.guild.UserGuildGalleryLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GuildGalleryLikeRepository extends JpaRepository<UserGuildGalleryLike, Long>{

	Optional<UserGuildGalleryLike> findByGalleryImage_IdAndUser_UserId(Long galleryImageId, Long userId);

	/**
	 * 길드 갤러리 ID 목록에 해당하는 좋아요를 삭제합니다.
	 *
	 * @param galleryImageIds 길드 갤러리 ID 목록
	 */
	void deleteByGalleryImage_IdIn(List<Long> galleryImageIds);
}

