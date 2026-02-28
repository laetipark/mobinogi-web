package com.example.mobinogi.repository;

import com.example.mobinogi.entity.LifeCraft;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LifeCraftRepository extends JpaRepository<LifeCraft, Long>{
	interface CraftFilterRow{
		String getCraftType();

		String getCraftName();
	}

	interface CraftRecipeCountRow{
		Long getItemId();

		Long getRecipeCount();
	}

	List<LifeCraft> findByItemId(Long itemId);

	List<LifeCraft> findByItemIdIn(List<Long> itemIds);

	@Query("""
		SELECT c.itemId AS itemId,
			COUNT(DISTINCT COALESCE(c.craftSubId, 0)) AS recipeCount
		FROM LifeCraft c
		WHERE c.itemId IN :itemIds
		GROUP BY c.itemId
		""")
	List<CraftRecipeCountRow> findRecipeCountsByItemIdIn(@Param("itemIds") List<Long> itemIds);
	
	void deleteAllByItemId(Long itemId);
	
	void deleteByCraftIdGreaterThanEqual(Long rowIndex);
	
	// 페이지네이션 지원 메서드
	@Query("""
		SELECT c
		FROM LifeCraft c
		LEFT JOIN c.gameItem gi
		LEFT JOIN c.ingredientItem ii
		WHERE gi.itemName LIKE %:keyword%
			OR ii.itemName LIKE %:keyword%
			OR c.itemName LIKE %:keyword%
			OR c.ingredientName LIKE %:keyword%
			OR c.craftType LIKE %:keyword%
			OR c.craftName LIKE %:keyword%
		""")
	Page<LifeCraft> findByKeyword(@Param("keyword") String keyword, Pageable pageable);

	@Query("""
		SELECT c
		FROM LifeCraft c
		LEFT JOIN c.gameItem gi
		LEFT JOIN c.ingredientItem ii
		WHERE (:keyword IS NULL
				OR gi.itemName LIKE %:keyword%
				OR ii.itemName LIKE %:keyword%
				OR c.itemName LIKE %:keyword%
				OR c.ingredientName LIKE %:keyword%
				OR c.craftType LIKE %:keyword%
				OR c.craftName LIKE %:keyword%)
			AND (:craftType IS NULL OR c.craftType = :craftType)
			AND (:craftName IS NULL OR c.craftName = :craftName)
		""")
	Page<LifeCraft> findByFilters(
		@Param("keyword") String keyword,
		@Param("craftType") String craftType,
		@Param("craftName") String craftName,
		Pageable pageable);

	@Query("""
		SELECT DISTINCT c.craftType AS craftType, c.craftName AS craftName
		FROM LifeCraft c
		WHERE c.craftType IS NOT NULL
			AND c.craftType <> ''
			AND c.craftName IS NOT NULL
			AND c.craftName <> ''
		ORDER BY c.craftType, c.craftName
		""")
	List<CraftFilterRow> findFilterRows();
}
