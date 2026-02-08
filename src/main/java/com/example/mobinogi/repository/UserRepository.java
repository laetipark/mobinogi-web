package com.example.mobinogi.repository;

import com.example.mobinogi.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>{

	Optional<User> findByKakaoId(Long kakaoId);

	Optional<User> findByKakaoIdAndDeletedAtIsNull(Long kakaoId);

	Optional<User> findByUserIdAndDeletedAtIsNull(Long userId);

	Optional<User> findByDiscordIdAndDeletedAtIsNull(String discordId);

	boolean existsByKakaoId(Long kakaoId);
}
