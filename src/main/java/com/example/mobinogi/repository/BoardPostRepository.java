package com.example.mobinogi.repository;

import com.example.mobinogi.entity.BoardPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface BoardPostRepository extends JpaRepository<BoardPost, Long>{

	Page<BoardPost> findByDeletedAtIsNullOrderByCreatedAtDesc(Pageable pageable);

	Page<BoardPost> findByCategoryIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long categoryId, Pageable pageable);

	Page<BoardPost> findBySourceTypeAndDeletedAtIsNullOrderByCreatedAtDesc(String sourceType, Pageable pageable);

	Page<BoardPost> findByCategoryIdAndSourceTypeAndDeletedAtIsNullOrderByCreatedAtDesc(
		Long categoryId, String sourceType, Pageable pageable);

	Optional<BoardPost> findByPostIdAndDeletedAtIsNull(Long postId);

	@Query("SELECT p FROM BoardPost p WHERE p.deletedAt IS NULL AND " +
		"(LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
		"LOWER(p.content) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
		"ORDER BY p.createdAt DESC")
	Page<BoardPost> searchPosts(@Param("keyword") String keyword, Pageable pageable);

	Optional<BoardPost> findByExternalIdAndSourceTypeAndDeletedAtIsNull(String externalId, String sourceType);
}
