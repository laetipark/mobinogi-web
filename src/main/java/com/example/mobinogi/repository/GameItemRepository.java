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
	
	// Exact match
	Optional<GameItem> findByItemName(String itemName);
	List<GameItem> findAllByItemNameOrderByItemIdAsc(String itemName);
	
	// Partial match (LIKE '%keyword%')
	List<GameItem> findByItemNameContaining(String keyword);
	
	// Prefix match (LIKE 'keyword%')
	List<GameItem> findByItemNameStartingWith(String prefix);
	
	// Suffix match (LIKE '%keyword')
	List<GameItem> findByItemNameEndingWith(String suffix);
	
	void deleteByItemIdGreaterThanEqual(Long itemId);
	
	// Paging query
	@NotNull Page<GameItem> findAll(@NotNull Pageable pageable);
	
	// Keyword search with paging
	Page<GameItem> findByItemNameContaining(String keyword, Pageable pageable);

	@Query("SELECT DISTINCT gi.itemType FROM GameItem gi WHERE gi.itemType IS NOT NULL AND gi.itemType <> '' ORDER BY gi.itemType ASC")
	List<String> findDistinctItemTypes();

	@Query("SELECT DISTINCT gi.itemMainMenu FROM GameItem gi WHERE gi.itemMainMenu IS NOT NULL AND gi.itemMainMenu <> ''")
	List<String> findDistinctItemMainMenus();

	@Query("SELECT DISTINCT gi.itemSubMenu FROM GameItem gi WHERE gi.itemSubMenu IS NOT NULL AND gi.itemSubMenu <> ''")
	List<String> findDistinctItemSubMenus();

	@Query("SELECT DISTINCT gi.itemMainMenu, gi.itemSubMenu, gi.itemType FROM GameItem gi " +
		"WHERE gi.itemMainMenu IS NOT NULL AND gi.itemMainMenu <> '' " +
		"AND gi.itemSubMenu IS NOT NULL AND gi.itemSubMenu <> ''")
	List<Object[]> findDistinctItemCategoryTriples();

	@Query("SELECT DISTINCT gi.itemRarity FROM GameItem gi WHERE gi.itemRarity IS NOT NULL AND gi.itemRarity <> ''")
	List<String> findDistinctItemRarities();
}
