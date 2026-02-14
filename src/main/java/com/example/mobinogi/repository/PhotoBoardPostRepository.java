package com.example.mobinogi.repository;

import com.example.mobinogi.entity.PhotoBoardPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PhotoBoardPostRepository extends JpaRepository<PhotoBoardPost, Long>{

	@Query("SELECT p FROM PhotoBoardPost p " +
		"WHERE p.deletedAt IS NULL " +
		"AND (:keyword IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
		"OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
		"OR LOWER(COALESCE(p.tags, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
		"AND (:tag IS NULL OR LOWER(COALESCE(p.tags, '')) LIKE LOWER(CONCAT('%', :tag, '%'))) " +
		"ORDER BY p.createdAt DESC")
	Page<PhotoBoardPost> searchPosts(
		@Param("keyword") String keyword,
		@Param("tag") String tag,
		Pageable pageable
	);

	Optional<PhotoBoardPost> findByPhotoPostIdAndDeletedAtIsNull(Long photoPostId);
}
