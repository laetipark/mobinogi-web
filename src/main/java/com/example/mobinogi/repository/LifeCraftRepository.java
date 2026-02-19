package com.example.mobinogi.repository;

import com.example.mobinogi.entity.LifeCraft;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LifeCraftRepository extends JpaRepository<LifeCraft, Long>{
	List<LifeCraft> findByItemId(Long itemId);

	List<LifeCraft> findByItemIdIn(List<Long> itemIds);
	
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
}
