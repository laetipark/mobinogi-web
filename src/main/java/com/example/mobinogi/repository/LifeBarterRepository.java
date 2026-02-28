package com.example.mobinogi.repository;

import com.example.mobinogi.entity.LifeBarter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LifeBarterRepository extends JpaRepository<LifeBarter, Long>{
	interface BarterFilterRow{
		Long getRegionId();

		String getRegionName();

		Long getNpcId();

		String getNpcName();
	}

	interface BarterSummaryRow{
		Long getItemId();

		String getRegionName();

		String getNpcName();

		String getExchangeItemName();

		Integer getExchangeCost();
	}

	List<LifeBarter> findByItemId(Long itemId);

	List<LifeBarter> findByItemIdIn(List<Long> itemIds);

	@Query("""
		SELECT b.itemId AS itemId,
			r.regionName AS regionName,
			n.npcName AS npcName,
			ei.itemName AS exchangeItemName,
			b.exchangeCost AS exchangeCost
		FROM LifeBarter b
		LEFT JOIN b.gameRegion r
		LEFT JOIN b.gameNpc n
		LEFT JOIN b.exchangeItem ei
		WHERE b.itemId IN :itemIds
		ORDER BY b.itemId ASC, r.regionName ASC, n.npcName ASC, ei.itemName ASC
		""")
	List<BarterSummaryRow> findSummaryRowsByItemIdIn(@Param("itemIds") List<Long> itemIds);
	
	List<LifeBarter> findByExchangeId(Long itemId);
	
	List<LifeBarter> findByGameItem_ItemName(String itemName);
	
	void deleteAllByItemId(Long itemId);
	
	void deleteAllByExchangeId(Long itemId);
	
	void deleteByBarterIdGreaterThanEqual(Long rowIndex);
	
	// 페이지네이션 지원 메서드
	@Query("SELECT b FROM LifeBarter b WHERE b.gameItem.itemName LIKE %:keyword% OR b.exchangeItem.itemName LIKE %:keyword%")
	Page<LifeBarter> findByKeyword(@Param("keyword") String keyword, Pageable pageable);

	@Query("""
		SELECT b
		FROM LifeBarter b
		WHERE (:keyword IS NULL
				OR b.gameItem.itemName LIKE %:keyword%
				OR b.exchangeItem.itemName LIKE %:keyword%)
			AND (:regionId IS NULL OR b.regionId = :regionId)
			AND (:npcId IS NULL OR b.npcId = :npcId)
		""")
	Page<LifeBarter> findByFilters(
		@Param("keyword") String keyword,
		@Param("regionId") Long regionId,
		@Param("npcId") Long npcId,
		Pageable pageable);

	@Query("""
		SELECT DISTINCT b.regionId AS regionId,
			COALESCE(r.regionName, '') AS regionName,
			b.npcId AS npcId,
			COALESCE(n.npcName, '') AS npcName
		FROM LifeBarter b
		LEFT JOIN b.gameRegion r
		LEFT JOIN b.gameNpc n
		ORDER BY COALESCE(r.regionName, ''), COALESCE(n.npcName, '')
		""")
	List<BarterFilterRow> findFilterRows();
	
	// 획득 아이템 기준 검색
	@Query("SELECT b FROM LifeBarter b WHERE b.gameItem.itemName LIKE %:keyword%")
	Page<LifeBarter> findByItemNameKeyword(@Param("keyword") String keyword, Pageable pageable);
	
	// 사이클 필터링
	Page<LifeBarter> findByBarterInitCycle(Integer barterInitCycle, Pageable pageable);
	
	@Query("SELECT b FROM LifeBarter b WHERE b.barterInitCycle = :cycle AND b.gameItem.itemName LIKE %:keyword%")
	Page<LifeBarter> findByItemNameKeywordAndCycle(@Param("keyword") String keyword, @Param("cycle") Integer cycle, Pageable pageable);
	
	List<LifeBarter> findByBarterServer(Integer barterServer);
	
	List<LifeBarter> findByBarterNpc(Integer barterNpc);

	List<LifeBarter> findByGameItem_ItemNameAndExchangeItem_ItemNameAndGameNpc_NpcName(
		String itemName, String exchangeItemName, String npcName);
}
