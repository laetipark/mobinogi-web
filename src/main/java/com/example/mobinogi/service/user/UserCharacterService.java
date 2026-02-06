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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserCharacterService{

	private final UserCharacterRepository userCharacterRepository;
	private final UserRepository userRepository;

	@Transactional(readOnly = true)
	public List<UserCharacterDto> getCharactersByUserId(Long userId){
		return userCharacterRepository.findByUser_UserIdAndDeletedAtIsNullOrderByCreatedAtDesc(userId)
			.stream()
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

		UserCharacter character = UserCharacter.builder()
			.user(user)
			.characterName(request.getCharacterName())
			.serverName(request.getServerName())
			.className(request.getClassName())
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
		character.setServerName(request.getServerName());
		character.setClassName(request.getClassName());

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
}
