package com.example.mobinogi.repository;

import com.example.mobinogi.entity.BoardPostHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BoardPostHistoryRepository extends JpaRepository<BoardPostHistory, Long>{

	List<BoardPostHistory> findByPostIdOrderByCreatedAtDesc(Long postId);
}
