package com.example.mobinogi.repository;

import com.example.mobinogi.entity.LifeBarter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LifeBarterRepository extends JpaRepository<LifeBarter, Integer>{
	List<LifeBarter> findByItemId(Integer itemId);

	List<LifeBarter> findByExchangeId(Integer itemId);

	List<LifeBarter> findByGameItem_ItemName(String itemName);

	void deleteAllByItemId(Integer itemId);

	void deleteAllByExchangeId(Integer itemId);

	void deleteByBarterIdGreaterThanEqual(int rowIndex);

	// 페이지네이션 지원 메서드
	@Query("SELECT b FROM LifeBarter b WHERE b.gameItem.itemName LIKE %:keyword% OR b.exchangeItem.itemName LIKE %:keyword%")
	Page<LifeBarter> findByKeyword(@Param("keyword") String keyword, Pageable pageable);

	// 획득 아이템 기준 검색
	@Query("SELECT b FROM LifeBarter b WHERE b.gameItem.itemName LIKE %:keyword%")
	Page<LifeBarter> findByItemNameKeyword(@Param("keyword") String keyword, Pageable pageable);

	// 사이클 필터링
	Page<LifeBarter> findByBarterInitCycle(Integer barterInitCycle, Pageable pageable);

	@Query("SELECT b FROM LifeBarter b WHERE b.barterInitCycle = :cycle AND b.gameItem.itemName LIKE %:keyword%")
	Page<LifeBarter> findByItemNameKeywordAndCycle(@Param("keyword") String keyword, @Param("cycle") Integer cycle, Pageable pageable);
}
