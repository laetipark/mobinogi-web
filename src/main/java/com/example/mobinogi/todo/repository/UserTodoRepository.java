package com.example.mobinogi.todo.repository;

import com.example.mobinogi.todo.entity.UserTodo;
import com.example.mobinogi.todo.entity.UserTodoId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * 사용자 TODO 리포지토리입니다.
 */
public interface UserTodoRepository extends JpaRepository<UserTodo, UserTodoId>{

	/**
	 * 사용자의 활성 TODO 목록을 조회합니다.
	 */
	List<UserTodo> findByUserIdAndDeletedAtIsNull(Long userId);

	/**
	 * 사용자/캐릭터 기준 활성 TODO 단건을 조회합니다.
	 */
	Optional<UserTodo> findByUserIdAndCharacterIdAndDeletedAtIsNull(Long userId, Long characterId);

	/**
	 * 삭제되지 않은 전체 TODO 목록을 조회합니다.
	 */
	List<UserTodo> findByDeletedAtIsNull();
}


