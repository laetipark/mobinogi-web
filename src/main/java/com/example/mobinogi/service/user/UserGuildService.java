package com.example.mobinogi.service.user;

import com.example.mobinogi.entity.UserGuild;
import com.example.mobinogi.repository.UserGuildRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class UserGuildService{
	
	private final UserGuildRepository userGuildRepository;
	
	/**
	 * 모든 길드원 기여도 정보 조회 (페이징)
	 */
	public Page<UserGuild> getAllUserGuilds(int page, int size, String sortBy, String sortDir){
		Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
		Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
		return userGuildRepository.findAll(pageable);
	}
	
	/**
	 * 멤버명으로 기여도 정보 검색
	 */
	public List<UserGuild> searchByMemberName(String memberName){
		return userGuildRepository.findByMemberNameContaining(memberName);
	}
	
	/**
	 * 정확한 멤버명으로 기여도 정보 조회
	 */
	public Optional<UserGuild> getByExactMemberName(String memberName){
		return userGuildRepository.findByMemberName(memberName);
	}
	
	/**
	 * 직업별 기여도 정보 조회
	 */
	public List<UserGuild> getByClassName(String className){
		return userGuildRepository.findByClassName(className);
	}
	
	/**
	 * 계열별 기여도 정보 조회
	 */
	public List<UserGuild> getByClassType(String classType){
		return userGuildRepository.findByClassType(classType);
	}
	
	/**
	 * 기여도 시작 상위 랭킹 조회
	 */
	public List<UserGuild> getTopContributionStartRanking(int limit){
		return userGuildRepository.findTopByContributionStart(limit);
	}
	
	/**
	 * 기여도 마무리 상위 랭킹 조회
	 */
	public List<UserGuild> getTopContributionFinishRanking(int limit){
		return userGuildRepository.findTopByContributionFinish(limit);
	}
	
	/**
	 * 변화량 상위 랭킹 조회 (증가량이 가장 큰 순)
	 */
	public List<UserGuild> getTopContributionChangedRanking(int limit){
		return userGuildRepository.findTopByContributionChanged(limit);
	}
	
	/**
	 * 특정 시간 이후 업데이트된 레코드 조회
	 */
	public List<UserGuild> getUpdatedAfter(LocalDateTime dateTime){
		return userGuildRepository.findByLastEditedTimeAfter(dateTime);
	}
	
	/**
	 * 마지막 동기화 시간 조회
	 */
	public LocalDateTime getLastSyncTime(){
		return userGuildRepository.findLatestLastEditedTime();
	}
	
	/**
	 * 전체 길드원 수 조회
	 */
	public long getTotalMemberCount(){
		return userGuildRepository.count();
	}
	
	/**
	 * ID로 기여도 정보 조회
	 */
	public Optional<UserGuild> getById(Long id){
		return userGuildRepository.findById(id);
	}
	
	/**
	 * 부캐릭터로 조회
	 */
	public List<UserGuild> getBySubCharacter(String subCharacter){
		return userGuildRepository.findBySubCharacterContaining(subCharacter);
	}
	
	/**
	 * 텍스트 정보로 조회
	 */
	public List<UserGuild> getByTextInfo(String textInfo){
		return userGuildRepository.findByTextInfoContaining(textInfo);
	}
	
	/**
	 * 기여도 범위로 조회
	 */
	public List<UserGuild> getByContributionRange(Integer minContribution, Integer maxContribution){
		return userGuildRepository.findByContributionFinishBetween(minContribution, maxContribution);
	}
	
	/**
	 * 수동 데이터 동기화 트리거 (관리자용)
	 */
	@Transactional
	public void triggerManualSync(){
		log.info("수동 Notion 동기화 요청됨");
		// NotionService 주입이 필요한 경우 별도 처리
	}
}
