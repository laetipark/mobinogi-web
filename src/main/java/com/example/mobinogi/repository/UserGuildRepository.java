package com.example.mobinogi.repository;

import com.example.mobinogi.entity.UserGuild;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserGuildRepository extends JpaRepository<UserGuild, Long>{
	
	/**
	 * 멤버명으로 기여도 정보 조회
	 */
	List<UserGuild> findByMemberNameContaining(String memberName);
	
	/**
	 * 직업별 기여도 정보 조회
	 */
	List<UserGuild> findByClassName(String className);
	
	/**
	 * 계열별 기여도 정보 조회
	 */
	List<UserGuild> findByClassType(String classType);
	
	/**
	 * Notion 페이지 ID로 조회 (중복 체크용)
	 */
	Optional<UserGuild> findByNotionPageId(String notionPageId);
	
	/**
	 * 기여도 순으로 상위 N명 조회 (시작 기여도 기준)
	 */
	@Query("SELECT u FROM UserGuild u ORDER BY u.contributionStart DESC LIMIT :limit")
	List<UserGuild> findTopByContributionStart(@Param("limit") int limit);
	
	/**
	 * 마무리 기여도 순으로 상위 N명 조회
	 */
	@Query("SELECT u FROM UserGuild u ORDER BY u.contributionFinish DESC LIMIT :limit")
	List<UserGuild> findTopByContributionFinish(@Param("limit") int limit);
	
	/**
	 * 변화량 순으로 상위 N명 조회 (증가량이 가장 큰 순)
	 */
	@Query("SELECT u FROM UserGuild u ORDER BY u.contributionChanged DESC LIMIT :limit")
	List<UserGuild> findTopByContributionChanged(@Param("limit") int limit);
	
	/**
	 * 특정 시간 이후에 업데이트된 레코드 조회
	 */
	List<UserGuild> findByLastEditedTimeAfter(LocalDateTime dateTime);
	
	/**
	 * 멤버명으로 정확히 일치하는 레코드 조회
	 */
	Optional<UserGuild> findByMemberName(String memberName);
	
	/**
	 * 마지막으로 업데이트된 시간 조회 (동기화 시점 확인용)
	 */
	@Query("SELECT MAX(u.lastEditedTime) FROM UserGuild u")
	LocalDateTime findLatestLastEditedTime();
	
	/**
	 * 부캐릭터 정보로 조회
	 */
	List<UserGuild> findBySubCharacterContaining(String subCharacter);
	
	/**
	 * 텍스트 정보로 조회
	 */
	List<UserGuild> findByTextInfoContaining(String textInfo);
	
	/**
	 * 특정 기여도 범위로 조회
	 */
	@Query("SELECT u FROM UserGuild u WHERE u.contributionFinish BETWEEN :minContribution AND :maxContribution")
	List<UserGuild> findByContributionFinishBetween(@Param("minContribution") Integer minContribution,
													@Param("maxContribution") Integer maxContribution);
}
