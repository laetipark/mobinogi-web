package com.example.mobinogi.repository;

import com.example.mobinogi.entity.user.UserCharacter;
import com.example.mobinogi.entity.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserCharacterRepository extends JpaRepository<UserCharacter, Long>{
	
	List<UserCharacter> findByUserAndDeletedAtIsNullOrderByCharacterOrderAsc(User user);
	
	List<UserCharacter> findByUser_UserIdAndDeletedAtIsNullOrderByCharacterOrderAsc(Long userId);
	
	@Query("SELECT COALESCE(MAX(uc.characterOrder), -1) FROM UserCharacter uc WHERE uc.user.userId = :userId AND uc.deletedAt IS NULL")
	int findMaxCharacterOrderByUserId(@Param("userId") Long userId);
	
	Optional<UserCharacter> findByCharacterIdAndDeletedAtIsNull(Long characterId);
	
	Optional<UserCharacter> findByCharacterIdAndUser_UserIdAndDeletedAtIsNull(Long characterId, Long userId);
	
	boolean existsByUser_UserIdAndCharacterNameAndDeletedAtIsNull(Long userId, String characterName);
}
