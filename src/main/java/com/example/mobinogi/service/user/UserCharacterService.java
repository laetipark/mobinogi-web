package com.example.mobinogi.service.user;

import com.example.mobinogi.dto.user.UserCharacterDto;
import com.example.mobinogi.dto.user.UserCharacterRequest;
import com.example.mobinogi.entity.User;
import com.example.mobinogi.entity.UserCharacter;
import com.example.mobinogi.repository.UserCharacterRepository;
import com.example.mobinogi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserCharacterService{
	
	private final UserCharacterRepository userCharacterRepository;
	private final UserRepository userRepository;
	
	@Transactional
	public List<UserCharacterDto> getCharactersByUserId(Long userId){
		List<UserCharacter> characters = userCharacterRepository.findByUser_UserIdAndDeletedAtIsNullOrderByCharacterOrderAsc(userId);
		
		// 마이그레이션: displayOrder가 null인 캐릭터가 있으면 createdAt 순으로 자동 할당
		boolean needsMigration = characters.stream().anyMatch(c -> c.getCharacterOrder() == null);
		if(needsMigration){
			characters.sort((a, b) -> {
				if(a.getCreatedAt() == null && b.getCreatedAt() == null)
					return 0;
				if(a.getCreatedAt() == null)
					return 1;
				if(b.getCreatedAt() == null)
					return -1;
				return a.getCreatedAt().compareTo(b.getCreatedAt());
			});
			for(int i = 0 ; i < characters.size() ; i++){
				characters.get(i).setCharacterOrder(i);
			}
			userCharacterRepository.saveAll(characters);
		}
		
		return characters.stream()
			.map(UserCharacterDto::fromEntity)
			.collect(Collectors.toList());
	}
	
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
			.characterServer(request.getServerName())
			.characterClass(request.getClassName())
			.characterOrder(maxOrder + 1)
			.build();
		
		character = userCharacterRepository.save(character);
		return UserCharacterDto.fromEntity(character);
	}
	
	@Transactional
	public UserCharacterDto updateCharacter(Long userId, Long characterId, UserCharacterRequest request){
		UserCharacter character = userCharacterRepository.findByCharacterIdAndUser_UserIdAndDeletedAtIsNull(characterId, userId)
			.orElseThrow(() -> new RuntimeException("캐릭터를 찾을 수 없습니다."));
		
		if(!character.getCharacterName().equals(request.getCharacterName()) &&
			userCharacterRepository.existsByUser_UserIdAndCharacterNameAndDeletedAtIsNull(userId, request.getCharacterName())){
			throw new RuntimeException("이미 등록된 캐릭터 이름입니다.");
		}
		
		character.setCharacterName(request.getCharacterName());
		character.setCharacterServer(request.getServerName());
		character.setCharacterClass(request.getClassName());
		
		character = userCharacterRepository.save(character);
		return UserCharacterDto.fromEntity(character);
	}
	
	@Transactional
	public void deleteCharacter(Long userId, Long characterId){
		UserCharacter character = userCharacterRepository.findByCharacterIdAndUser_UserIdAndDeletedAtIsNull(characterId, userId)
			.orElseThrow(() -> new RuntimeException("캐릭터를 찾을 수 없습니다."));
		
		character.setDeletedAt(LocalDateTime.now());
		userCharacterRepository.save(character);
	}
	
	@Transactional
	public void reorderCharacters(Long userId, List<Long> characterIds){
		List<UserCharacter> characters = userCharacterRepository.findByUser_UserIdAndDeletedAtIsNullOrderByCharacterOrderAsc(userId);
		
		Map<Long, UserCharacter> characterMap = characters.stream()
			.collect(Collectors.toMap(UserCharacter::getCharacterId, c -> c));
		
		for(int i = 0 ; i < characterIds.size() ; i++){
			UserCharacter character = characterMap.get(characterIds.get(i));
			if(character != null){
				character.setCharacterOrder(i);
			}
		}
		
		userCharacterRepository.saveAll(characters);
	}
}
