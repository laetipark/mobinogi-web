package com.example.mobinogi.repository;

import com.example.mobinogi.entity.UserTodoBarter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserTodoBarterRepository extends JpaRepository<UserTodoBarter, Long>{

	List<UserTodoBarter> findByUserIdAndCharacterIdAndDeletedAtIsNull(Long userId, Long characterId);

	Optional<UserTodoBarter> findByIdAndUserIdAndDeletedAtIsNull(Long id, Long userId);

	@Modifying
	@Query("UPDATE UserTodoBarter b SET b.completed = false WHERE b.deletedAt IS NULL")
	void resetAllCompleted();

	@Modifying
	@Query("UPDATE UserTodoBarter b SET b.completed = false WHERE b.deletedAt IS NULL AND b.barterCycle = :cycle")
	void resetCompletedByCycle(String cycle);

	// 이름 기반: 같은 유저의 모든 캐릭터에서 매칭 (서버 공유용)
	List<UserTodoBarter> findByUserIdAndItemNameAndExchangeItemNameAndNpcNameAndDeletedAtIsNull(
		Long userId, String itemName, String exchangeItemName, String npcName);

	// 이름 기반: 같은 캐릭터에서만 매칭 (NPC 공유용)
	List<UserTodoBarter> findByUserIdAndCharacterIdAndItemNameAndExchangeItemNameAndNpcNameAndDeletedAtIsNull(
		Long userId, Long characterId, String itemName, String exchangeItemName, String npcName);
}
