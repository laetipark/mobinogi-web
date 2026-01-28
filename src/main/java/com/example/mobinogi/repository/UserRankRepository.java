package com.example.mobinogi.repository;

import com.example.mobinogi.entity.UserRank;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserRankRepository extends JpaRepository<UserRank, Integer> {

	/**
	 * 캐릭터명으로 검색 (대소문자 구분 없이, 부분 매칭)
	 */
	List<UserRank> findByUserNameContainingIgnoreCase(String userName);
}