package com.example.mobinogi.repository;

import com.example.mobinogi.entity.UserTodo;
import com.example.mobinogi.entity.UserTodoId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserTodoRepository extends JpaRepository<UserTodo, UserTodoId>{

	List<UserTodo> findByUserIdAndDeletedAtIsNull(Long userId);

	Optional<UserTodo> findByUserIdAndCharacterIdAndDeletedAtIsNull(Long userId, Long characterId);

	List<UserTodo> findByDeletedAtIsNull();
}
