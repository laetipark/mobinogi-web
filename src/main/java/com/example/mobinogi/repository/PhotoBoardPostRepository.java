package com.example.mobinogi.repository;

import com.example.mobinogi.entity.board.PhotoBoardPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

@Repository
/**
 * 포토 게시글 저장소입니다.
 */
public interface PhotoBoardPostRepository extends JpaRepository<PhotoBoardPost, Long>{

	/**
	 * 키워드/태그 조건으로 게시글을 검색합니다.
	 *
	 * @param keyword 제목/본문/태그 검색 키워드
	 * @param tag 태그 검색어
	 * @param pageable 페이지 정보
	 * @return 검색 결과 페이지
	 */
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

	/**
	 * 삭제되지 않은 게시글을 ID로 조회합니다.
	 *
	 * @param photoPostId 게시글 ID
	 * @return 게시글(optional)
	 */
	Optional<PhotoBoardPost> findByPhotoPostIdAndDeletedAtIsNull(Long photoPostId);

	/**
	 * slug/title 기반 접근을 위해 동일 제목의 최신 게시글을 조회합니다.
	 *
	 * @param title 게시글 제목
	 * @return 동일 제목 최신 게시글(optional)
	 */
	Optional<PhotoBoardPost> findFirstByTitleIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(String title);

	/**
	 * 삭제되지 않은 게시글을 생성일 내림차순으로 조회합니다.
	 *
	 * @return 게시글 목록
	 */
	List<PhotoBoardPost> findByDeletedAtIsNullOrderByCreatedAtDesc();

	/**
	 * 삭제된 게시글 중 기준 시각 이전(포함) 항목을 오래된 순으로 조회합니다.
	 *
	 * @param threshold 삭제 보존 만료 기준 시각
	 * @param pageable 조회 배치 조건
	 * @return 보존 만료 게시글 목록
	 */
	List<PhotoBoardPost> findByDeletedAtIsNotNullAndDeletedAtLessThanEqualOrderByDeletedAtAsc(
		LocalDateTime threshold,
		Pageable pageable
	);

	/**
	 * 게시글 ID 목록 기준으로 하드 삭제합니다.
	 *
	 * @param photoPostIds 삭제 대상 게시글 ID 목록
	 */
	void deleteByPhotoPostIdIn(List<Long> photoPostIds);
}
