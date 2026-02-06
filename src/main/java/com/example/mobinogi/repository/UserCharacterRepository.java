package com.example.mobinogi.repository;

import com.example.mobinogi.entity.UserCharacter;
import com.example.mobinogi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserCharacterRepository extends JpaRepository<UserCharacter, Long>{

	List<UserCharacter> findByUserAndDeletedAtIsNullOrderByCreatedAtDesc(User user);

	List<UserCharacter> findByUser_UserIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long userId);

	Optional<UserCharacter> findByCharacterIdAndDeletedAtIsNull(Long characterId);

	Optional<UserCharacter> findByCharacterIdAndUser_UserIdAndDeletedAtIsNull(Long characterId, Long userId);

	boolean existsByUser_UserIdAndCharacterNameAndDeletedAtIsNull(Long userId, String characterName);
}
