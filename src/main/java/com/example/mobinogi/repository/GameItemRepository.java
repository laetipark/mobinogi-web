package com.example.mobinogi.repository;

import com.example.mobinogi.entity.GameItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GameItemRepository extends JpaRepository<GameItem, Integer>{
	
	// 정확히 일치
	Optional<GameItem> findByItemName(String itemName);
	
	// 부분 일치 (LIKE '%keyword%')
	List<GameItem> findByItemNameContaining(String keyword);
	
	// 앞부분 일치 (LIKE 'keyword%')
	List<GameItem> findByItemNameStartingWith(String prefix);
	
	// 뒷부분 일치 (LIKE '%keyword')
	List<GameItem> findByItemNameEndingWith(String suffix);
	
	void deleteByItemIdGreaterThanEqual(int itemId);
}
