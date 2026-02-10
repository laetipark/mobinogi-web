package com.example.mobinogi.repository;

import com.example.mobinogi.entity.GameEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface GameEventRepository extends JpaRepository<GameEvent, String>{

	List<GameEvent> findByDeletedAtIsNullAndEndDateAfterOrderByEndDateAsc(LocalDateTime now);
}
