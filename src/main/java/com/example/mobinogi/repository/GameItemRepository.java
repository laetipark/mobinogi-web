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
	List<GameItem> findAllByItemNameOrderByItemIdAsc(String itemName);
	
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

	@Query("SELECT DISTINCT gi.itemMainMenu FROM GameItem gi " +
		"WHERE gi.itemMainMenu IS NOT NULL AND gi.itemMainMenu <> '' " +
		"ORDER BY CASE " +
		"WHEN gi.itemMainMenu = '\uC7A5\uBE44' THEN 0 " +
		"WHEN gi.itemMainMenu = '\uB3C4\uAD6C' THEN 1 " +
		"WHEN gi.itemMainMenu = '\uC544\uC774\uD15C' THEN 2 " +
		"WHEN gi.itemMainMenu = '\uD328\uC158' THEN 3 " +
		"WHEN gi.itemMainMenu IN ('\uD0C8\uAC83/\uD3AB', '\uD3AB/\uD0C8\uAC83') THEN 4 " +
		"ELSE 999 END ASC, gi.itemMainMenu ASC")
	List<String> findDistinctItemMainMenus();

	@Query("SELECT DISTINCT gi.itemSubMenu FROM GameItem gi WHERE gi.itemSubMenu IS NOT NULL AND gi.itemSubMenu <> '' ORDER BY gi.itemSubMenu ASC")
	List<String> findDistinctItemSubMenus();

	@Query("SELECT DISTINCT gi.itemMainMenu, gi.itemSubMenu, gi.itemType FROM GameItem gi " +
		"WHERE (gi.itemMainMenu IS NOT NULL AND gi.itemMainMenu <> '') " +
		"OR (gi.itemSubMenu IS NOT NULL AND gi.itemSubMenu <> '') " +
		"OR (gi.itemType IS NOT NULL AND gi.itemType <> '') " +
		"ORDER BY " +
		"CASE " +
		"WHEN gi.itemMainMenu = '\uC7A5\uBE44' THEN 0 " +
		"WHEN gi.itemMainMenu = '\uB3C4\uAD6C' THEN 1 " +
		"WHEN gi.itemMainMenu = '\uC544\uC774\uD15C' THEN 2 " +
		"WHEN gi.itemMainMenu = '\uD328\uC158' THEN 3 " +
		"WHEN gi.itemMainMenu IN ('\uD0C8\uAC83/\uD3AB', '\uD3AB/\uD0C8\uAC83') THEN 4 " +
		"ELSE 999 END ASC, " +
		"CASE " +
		"WHEN gi.itemMainMenu = '\uC7A5\uBE44' AND gi.itemSubMenu = '\uBB34\uAE30' THEN 0 " +
		"WHEN gi.itemMainMenu = '\uC7A5\uBE44' AND gi.itemSubMenu = '\uBC29\uC5B4\uAD6C' THEN 1 " +
		"WHEN gi.itemMainMenu = '\uC7A5\uBE44' AND gi.itemSubMenu = '\uC7A5\uC2E0\uAD6C' THEN 2 " +
		"WHEN gi.itemMainMenu = '\uC7A5\uBE44' AND gi.itemSubMenu = '\uBCF4\uC11D' THEN 3 " +
		"WHEN gi.itemMainMenu = '\uC7A5\uBE44' AND gi.itemSubMenu = '\uB8EC' THEN 4 " +
		"WHEN gi.itemMainMenu = '\uC7A5\uBE44' AND gi.itemSubMenu = '\uC5E0\uBE14\uB7FC' THEN 5 " +
		"WHEN gi.itemMainMenu = '\uC7A5\uBE44' AND gi.itemSubMenu = '\uC544\uD2F0\uD329\uD2B8' THEN 6 " +
		"WHEN gi.itemMainMenu = '\uB3C4\uAD6C' AND gi.itemSubMenu = '\uC0DD\uD65C\uB3C4\uAD6C' THEN 100 " +
		"WHEN gi.itemMainMenu = '\uB3C4\uAD6C' AND gi.itemSubMenu = '\uAC00\uBC29' THEN 101 " +
		"WHEN gi.itemMainMenu = '\uB3C4\uAD6C' AND gi.itemSubMenu = '\uC545\uAE30' THEN 102 " +
		"WHEN gi.itemMainMenu = '\uB3C4\uAD6C' AND gi.itemSubMenu = '\uC545\uBCF4' THEN 103 " +
		"WHEN gi.itemMainMenu = '\uB3C4\uAD6C' AND gi.itemSubMenu = '\uB180\uC774' THEN 104 " +
		"WHEN gi.itemMainMenu = '\uB3C4\uAD6C' AND gi.itemSubMenu = '\uB370\uCF54' THEN 105 " +
		"WHEN gi.itemMainMenu = '\uB3C4\uAD6C' AND gi.itemSubMenu = '\uAE30\uD0C0' THEN 106 " +
		"WHEN gi.itemMainMenu = '\uC544\uC774\uD15C' AND gi.itemSubMenu = '\uC18C\uBAA8\uD488' THEN 200 " +
		"WHEN gi.itemMainMenu = '\uC544\uC774\uD15C' AND gi.itemSubMenu = '\uC74C\uC2DD' THEN 201 " +
		"WHEN gi.itemMainMenu = '\uC544\uC774\uD15C' AND gi.itemSubMenu = '\uD035\uC2AC\uB86F' THEN 202 " +
		"WHEN gi.itemMainMenu = '\uC544\uC774\uD15C' AND gi.itemSubMenu = '\uC7AC\uB8CC' THEN 203 " +
		"WHEN gi.itemMainMenu = '\uC544\uC774\uD15C' AND gi.itemSubMenu = '\uC7AC\uD654' THEN 204 " +
		"WHEN gi.itemMainMenu = '\uC544\uC774\uD15C' AND gi.itemSubMenu = '\uD018\uC2A4\uD2B8' THEN 205 " +
		"WHEN gi.itemMainMenu = '\uD328\uC158' AND gi.itemSubMenu = '\uC758\uC0C1' THEN 300 " +
		"WHEN gi.itemMainMenu = '\uD328\uC158' AND gi.itemSubMenu = '\uC7A5\uC2DD' THEN 301 " +
		"WHEN gi.itemMainMenu = '\uD328\uC158' AND gi.itemSubMenu = '\uD328\uC158 \uBB34\uAE30' THEN 302 " +
		"WHEN gi.itemMainMenu = '\uD328\uC158' AND gi.itemSubMenu = '\uC5FC\uC0C9' THEN 303 " +
		"WHEN gi.itemMainMenu IN ('\uD0C8\uAC83/\uD3AB', '\uD3AB/\uD0C8\uAC83') AND gi.itemSubMenu = '\uB3D9\uD589 \uD3AB' THEN 400 " +
		"WHEN gi.itemMainMenu IN ('\uD0C8\uAC83/\uD3AB', '\uD3AB/\uD0C8\uAC83') AND gi.itemSubMenu = '\uD0C8\uAC83' THEN 401 " +
		"WHEN gi.itemMainMenu IN ('\uD0C8\uAC83/\uD3AB', '\uD3AB/\uD0C8\uAC83') AND gi.itemSubMenu = '\uD0C8\uAC83 \uC7A5\uBE44' THEN 402 " +
		"ELSE 9999 END ASC, gi.itemSubMenu ASC, gi.itemType ASC")
	List<Object[]> findDistinctItemCategoryTriples();

	@Query("SELECT DISTINCT gi.itemRarity FROM GameItem gi WHERE gi.itemRarity IS NOT NULL AND gi.itemRarity <> '' ORDER BY gi.itemRarity ASC")
	List<String> findDistinctItemRarities();
}
