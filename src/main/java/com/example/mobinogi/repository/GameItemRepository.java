package com.example.mobinogi.repository;

import com.example.mobinogi.entity.GameItem;
import org.jetbrains.annotations.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface GameItemRepository extends JpaRepository<GameItem, Integer>, JpaSpecificationExecutor<GameItem>{
	
	// 정확히 일치
	Optional<GameItem> findByItemName(String itemName);
	
	// 부분 일치 (LIKE '%keyword%')
	List<GameItem> findByItemNameContaining(String keyword);
	
	// 앞부분 일치 (LIKE 'keyword%')
	List<GameItem> findByItemNameStartingWith(String prefix);
	
	// 뒷부분 일치 (LIKE '%keyword')
	List<GameItem> findByItemNameEndingWith(String suffix);
	
	void deleteByItemIdGreaterThanEqual(Long itemId);
	
	// 페이지네이션을 위한 메소드
	@NotNull Page<GameItem> findAll(@NotNull Pageable pageable);
	
	// 키워드로 검색하면서 페이지네이션
	Page<GameItem> findByItemNameContaining(String keyword, Pageable pageable);

	@Query("SELECT DISTINCT gi.itemType FROM GameItem gi WHERE gi.itemType IS NOT NULL AND gi.itemType <> '' ORDER BY gi.itemType ASC")
	List<String> findDistinctItemTypes();

	@Query("SELECT DISTINCT gi.itemRarity FROM GameItem gi WHERE gi.itemRarity IS NOT NULL AND gi.itemRarity <> '' ORDER BY gi.itemRarity ASC")
	List<String> findDistinctItemRarities();
}
