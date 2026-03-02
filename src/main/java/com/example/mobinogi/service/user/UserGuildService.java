package com.example.mobinogi.service.user;

import com.example.mobinogi.entity.guild.UserGuildMember;
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

/**
 * Read service for guild member dataset.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class UserGuildService{

	/** Guild member repository. */
	private final UserGuildRepository userGuildRepository;

	/**
	 * Returns paged guild members.
	 *
	 * @param page page index
	 * @param size page size
	 * @param sortBy sort field
	 * @param sortDir sort direction
	 * @return member page
	 */
	public Page<UserGuildMember> getAllUserGuilds(int page, int size, String sortBy, String sortDir){
		Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
		Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
		return userGuildRepository.findAll(pageable);
	}

	/**
	 * Searches members by partial member name.
	 *
	 * @param memberName member name keyword
	 * @return matched members
	 */
	public List<UserGuildMember> searchByMemberName(String memberName){
		return userGuildRepository.findByMemberNameContaining(memberName);
	}

	/**
	 * Returns one member by exact member name.
	 *
	 * @param memberName exact member name
	 * @return matched member
	 */
	public Optional<UserGuildMember> getByExactMemberName(String memberName){
		return userGuildRepository.findByMemberName(memberName);
	}

	/**
	 * Returns members by class name.
	 *
	 * @param className class name
	 * @return matched members
	 */
	public List<UserGuildMember> getByClassName(String className){
		return userGuildRepository.findByClassName(className);
	}

	/**
	 * Returns members by class type.
	 *
	 * @param classType class type
	 * @return matched members
	 */
	public List<UserGuildMember> getByClassType(String classType){
		return userGuildRepository.findByClassType(classType);
	}

	/**
	 * Returns top members by start contribution.
	 *
	 * @param limit max rows
	 * @return ranking rows
	 */
	public List<UserGuildMember> getTopContributionStartRanking(int limit){
		return userGuildRepository.findTopByContributionStart(limit);
	}

	/**
	 * Returns top members by finish contribution.
	 *
	 * @param limit max rows
	 * @return ranking rows
	 */
	public List<UserGuildMember> getTopContributionFinishRanking(int limit){
		return userGuildRepository.findTopByContributionFinish(limit);
	}

	/**
	 * Returns top members by changed contribution.
	 *
	 * @param limit max rows
	 * @return ranking rows
	 */
	public List<UserGuildMember> getTopContributionChangedRanking(int limit){
		return userGuildRepository.findTopByContributionChanged(limit);
	}

	/**
	 * Returns members updated after target datetime.
	 *
	 * @param dateTime threshold time
	 * @return member rows
	 */
	public List<UserGuildMember> getUpdatedAfter(LocalDateTime dateTime){
		return userGuildRepository.findByUpdatedAtAfter(dateTime);
	}

	/**
	 * Returns most recent sync time.
	 *
	 * @return last sync timestamp
	 */
	public LocalDateTime getLastSyncTime(){
		return userGuildRepository.findTopByOrderByUpdatedAtDesc()
			.map(UserGuildMember::getUpdatedAt)
			.orElse(null);
	}

	/**
	 * Returns total member count.
	 *
	 * @return member count
	 */
	public long getTotalMemberCount(){
		return userGuildRepository.count();
	}

	/**
	 * Returns member by primary key.
	 *
	 * @param id member ID
	 * @return member
	 */
	public Optional<UserGuildMember> getById(Long id){
		return userGuildRepository.findById(id);
	}

	/**
	 * Returns members filtered by sub-character keyword.
	 *
	 * @param subCharacter sub-character keyword
	 * @return matched members
	 */
	public List<UserGuildMember> getBySubCharacter(String subCharacter){
		return userGuildRepository.findBySubCharacterContaining(subCharacter);
	}

	/**
	 * Returns members in contribution range.
	 *
	 * @param minContribution minimum contribution
	 * @param maxContribution maximum contribution
	 * @return matched members
	 */
	public List<UserGuildMember> getByContributionRange(Integer minContribution, Integer maxContribution){
		return userGuildRepository.findByContributionFinishBetween(minContribution, maxContribution);
	}

	/**
	 * Placeholder for manual synchronization trigger hook.
	 */
	@Transactional
	public void triggerManualSync(){
		log.info("Manual user guild sync requested");
	}
}
