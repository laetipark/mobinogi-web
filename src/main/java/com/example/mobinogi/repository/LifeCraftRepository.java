package com.example.mobinogi.repository;

import com.example.mobinogi.entity.LifeCraft;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LifeCraftRepository extends JpaRepository<LifeCraft, Integer>{
	List<LifeCraft> findByItemId(Integer itemId);

	void deleteAllByItemId(Integer itemId);

	void deleteByCraftIdGreaterThanEqual(int rowIndex);

	// 페이지네이션 지원 메서드
	@Query("SELECT c FROM LifeCraft c WHERE c.gameItem.itemName LIKE %:keyword% OR c.ingredientItem.itemName LIKE %:keyword%")
	Page<LifeCraft> findByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
