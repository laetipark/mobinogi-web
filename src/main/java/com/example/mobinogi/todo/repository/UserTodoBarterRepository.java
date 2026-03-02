package com.example.mobinogi.todo.repository;

import com.example.mobinogi.todo.entity.UserTodoBarter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * 사용자 물물교환 TODO 리포지토리입니다.
 */
public interface UserTodoBarterRepository extends JpaRepository<UserTodoBarter, Long>{

	/**
	 * 사용자/캐릭터 기준 활성 물물교환 목록을 조회합니다.
	 */
	List<UserTodoBarter> findByUserIdAndCharacterIdAndDeletedAtIsNull(Long userId, Long characterId);

	/**
	 * 사용자 소유의 활성 물물교환 단건을 조회합니다.
	 */
	Optional<UserTodoBarter> findByIdAndUserIdAndDeletedAtIsNull(Long id, Long userId);

	/**
	 * 전체 물물교환 완료 상태를 초기화합니다.
	 */
	@Modifying
	@Query("""
		UPDATE UserTodoBarter b
		SET b.completed = false,
			b.completedCount = 0,
			b.checkedByUserId = null,
			b.checkedByNickname = null,
			b.checkedByCharacterId = null,
			b.checkedByCharacterName = null,
			b.checkedAt = null
		WHERE b.deletedAt IS NULL
	""")
	void resetAllCompleted();

	/**
	 * 특정 사이클(daily/weekly) 물물교환 완료 상태를 초기화합니다.
	 */
	@Modifying
	@Query("""
		UPDATE UserTodoBarter b
		SET b.completed = false,
			b.completedCount = 0,
			b.checkedByUserId = null,
			b.checkedByNickname = null,
			b.checkedByCharacterId = null,
			b.checkedByCharacterName = null,
			b.checkedAt = null
		WHERE b.deletedAt IS NULL
		  AND b.barterCycle = :cycle
	""")
	void resetCompletedByCycle(String cycle);

	/**
	 * 이름 기반으로 같은 유저의 모든 캐릭터에서 매칭합니다. (서버 공유형)
	 */
	List<UserTodoBarter> findByUserIdAndItemNameAndExchangeItemNameAndNpcNameAndDeletedAtIsNull(
		Long userId, String itemName, String exchangeItemName, String npcName);

	/**
	 * 이름 기반으로 같은 캐릭터에서만 매칭합니다. (NPC 공유형)
	 */
	List<UserTodoBarter> findByUserIdAndCharacterIdAndItemNameAndExchangeItemNameAndNpcNameAndDeletedAtIsNull(
		Long userId, Long characterId, String itemName, String exchangeItemName, String npcName);

	/**
	 * 캐릭터 ID 집합 범위에서 이름 기반으로 매칭합니다.
	 */
	List<UserTodoBarter> findByUserIdAndCharacterIdInAndItemNameAndExchangeItemNameAndNpcNameAndDeletedAtIsNull(
		Long userId, Collection<Long> characterIds, String itemName, String exchangeItemName, String npcName);
}


