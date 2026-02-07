package com.example.mobinogi.repository;

import com.example.mobinogi.entity.BoardComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BoardCommentRepository extends JpaRepository<BoardComment, Long>{

	List<BoardComment> findByPostIdAndDeletedAtIsNullOrderByCreatedAtAsc(Long postId);

	Optional<BoardComment> findByCommentIdAndDeletedAtIsNull(Long commentId);

	long countByPostIdAndDeletedAtIsNull(Long postId);
}
