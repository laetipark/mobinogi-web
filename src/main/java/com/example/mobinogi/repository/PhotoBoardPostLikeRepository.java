package com.example.mobinogi.repository;

import com.example.mobinogi.entity.board.PhotoBoardPostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PhotoBoardPostLikeRepository extends JpaRepository<PhotoBoardPostLike, Long>{

	Optional<PhotoBoardPostLike> findByPhotoPostIdAndUserId(Long photoPostId, Long userId);

	long countByPhotoPostId(Long photoPostId);

	@Query("SELECT l.photoPostId FROM PhotoBoardPostLike l WHERE l.userId = :userId AND l.photoPostId IN :photoPostIds")
	List<Long> findLikedPhotoPostIdsByUserIdAndPhotoPostIds(
		@Param("userId") Long userId,
		@Param("photoPostIds") List<Long> photoPostIds
	);

	/**
	 * 게시글 ID 목록에 해당하는 좋아요를 삭제합니다.
	 *
	 * @param photoPostIds 게시글 ID 목록
	 */
	void deleteByPhotoPostIdIn(List<Long> photoPostIds);
}
