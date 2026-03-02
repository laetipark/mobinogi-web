package com.example.mobinogi.service.user;

import com.example.mobinogi.dto.user.UserCharacterDto;
import com.example.mobinogi.dto.user.UserCharacterRequest;
import com.example.mobinogi.entity.user.User;
import com.example.mobinogi.entity.user.UserCharacter;
import com.example.mobinogi.repository.UserCharacterRepository;
import com.example.mobinogi.repository.UserRankRepository;
import com.example.mobinogi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * User character management service.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserCharacterService{

	/** Character repository. */
	private final UserCharacterRepository userCharacterRepository;

	/** User repository for ownership validation. */
	private final UserRepository userRepository;

	/** Rank repository for latest stat projection. */
	private final UserRankRepository userRankRepository;

	/**
	 * Returns all active characters for a user.
	 * Missing display order rows are migrated using creation time order.
	 *
	 * @param userId user ID
	 * @return character DTO list
	 */
	@Transactional
	public List<UserCharacterDto> getCharactersByUserId(Long userId){
		List<UserCharacter> characters = userCharacterRepository.findByUser_UserIdAndDeletedAtIsNullOrderByCharacterOrderAsc(userId);

		// Migration: assign missing order values by createdAt sequence.
		boolean needsMigration = characters.stream().anyMatch(character -> character.getCharacterOrder() == null);
		if(needsMigration){
			log.info("Detected character order migration target. userId={}, characterCount={}", userId, characters.size());
			characters.sort((left, right) -> {
				if(left.getCreatedAt() == null && right.getCreatedAt() == null){
					return 0;
				}
				if(left.getCreatedAt() == null){
					return 1;
				}
				if(right.getCreatedAt() == null){
					return -1;
				}
				return left.getCreatedAt().compareTo(right.getCreatedAt());
			});
			for(int index = 0 ; index < characters.size() ; index++){
				characters.get(index).setCharacterOrder(index);
			}
			userCharacterRepository.saveAll(characters);
		}

		return characters.stream()
			.map(character -> {
				UserCharacterDto dto = UserCharacterDto.fromEntity(character);

				// Attach latest rank snapshot when server metadata is available.
				if(character.getCharacterServer() != null){
					var rankOpt = userRankRepository.findLatestActiveByServerIdAndUserName(
						character.getCharacterServer(),
						character.getCharacterName()
					);
					if(rankOpt.isPresent()){
						var rank = rankOpt.get();
						dto.setUserPower(rank.getUserPower());
						dto.setUserVitality(rank.getUserVitality());
						dto.setUserAttractiveness(rank.getUserAttractiveness());
						dto.setRankUpdatedAt(rank.getUpdatedAt());
					}
				}
				return dto;
			})
			.collect(Collectors.toList());
	}

	/**
	 * Creates a character for a user.
	 *
	 * @param userId user ID
	 * @param request create payload
	 * @return created character DTO
	 */
	@Transactional
	public UserCharacterDto createCharacter(Long userId, UserCharacterRequest request){
		User user = userRepository.findByUserIdAndDeletedAtIsNull(userId)
			.orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

		if(userCharacterRepository.existsByUser_UserIdAndCharacterNameAndDeletedAtIsNull(userId, request.getCharacterName())){
			throw new RuntimeException("이미 등록된 캐릭터 이름입니다.");
		}

		int maxOrder = userCharacterRepository.findMaxCharacterOrderByUserId(userId);
		UserCharacter character = UserCharacter.builder()
			.user(user)
			.characterName(request.getCharacterName())
			.characterServer(request.getServerId())
			.characterClass(request.getClassId())
			.characterOrder(maxOrder + 1)
			.build();

		UserCharacter saved = userCharacterRepository.save(character);
		return UserCharacterDto.fromEntity(saved);
	}

	/**
	 * Updates one character.
	 *
	 * @param userId user ID
	 * @param characterId character ID
	 * @param request update payload
	 * @return updated character DTO
	 */
	@Transactional
	public UserCharacterDto updateCharacter(Long userId, Long characterId, UserCharacterRequest request){
		UserCharacter character = userCharacterRepository.findByCharacterIdAndUser_UserIdAndDeletedAtIsNull(characterId, userId)
			.orElseThrow(() -> new RuntimeException("캐릭터를 찾을 수 없습니다."));

		boolean changedName = !character.getCharacterName().equals(request.getCharacterName());
		if(changedName && userCharacterRepository.existsByUser_UserIdAndCharacterNameAndDeletedAtIsNull(userId, request.getCharacterName())){
			throw new RuntimeException("이미 등록된 캐릭터 이름입니다.");
		}

		character.setCharacterName(request.getCharacterName());
		character.setCharacterServer(request.getServerId());
		character.setCharacterClass(request.getClassId());

		UserCharacter saved = userCharacterRepository.save(character);
		return UserCharacterDto.fromEntity(saved);
	}

	/**
	 * Soft-deletes a character.
	 *
	 * @param userId user ID
	 * @param characterId character ID
	 */
	@Transactional
	public void deleteCharacter(Long userId, Long characterId){
		UserCharacter character = userCharacterRepository.findByCharacterIdAndUser_UserIdAndDeletedAtIsNull(characterId, userId)
			.orElseThrow(() -> new RuntimeException("캐릭터를 찾을 수 없습니다."));

		character.setDeletedAt(LocalDateTime.now());
		userCharacterRepository.save(character);
	}

	/**
	 * Reorders characters by incoming ID sequence.
	 *
	 * @param userId user ID
	 * @param characterIds ordered character IDs
	 */
	@Transactional
	public void reorderCharacters(Long userId, List<Long> characterIds){
		List<UserCharacter> characters = userCharacterRepository.findByUser_UserIdAndDeletedAtIsNullOrderByCharacterOrderAsc(userId);
		Map<Long, UserCharacter> characterMap = characters.stream()
			.collect(Collectors.toMap(UserCharacter::getCharacterId, character -> character));

		// Apply order only to rows that belong to this user.
		for(int index = 0 ; index < characterIds.size() ; index++){
			UserCharacter character = characterMap.get(characterIds.get(index));
			if(character != null){
				character.setCharacterOrder(index);
			}
		}

		userCharacterRepository.saveAll(characters);
	}
}
