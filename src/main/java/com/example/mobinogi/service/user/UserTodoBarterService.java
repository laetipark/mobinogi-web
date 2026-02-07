package com.example.mobinogi.service.user;

import com.example.mobinogi.dto.user.UserTodoBarterDto;
import com.example.mobinogi.entity.UserTodoBarter;
import com.example.mobinogi.repository.UserTodoBarterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserTodoBarterService{

	private final UserTodoBarterRepository userTodoBarterRepository;

	@Transactional(readOnly = true)
	public List<UserTodoBarterDto> getBarterCart(Long userId, Long characterId){
		return userTodoBarterRepository.findByUserIdAndCharacterIdAndDeletedAtIsNull(userId, characterId)
			.stream()
			.map(UserTodoBarterDto::fromEntity)
			.collect(Collectors.toList());
	}

	@Transactional
	public UserTodoBarterDto addBarterItem(Long userId, Long characterId, Integer barterId, String barterCycle){
		UserTodoBarter barter = UserTodoBarter.builder()
			.userId(userId)
			.characterId(characterId)
			.barterId(barterId)
			.barterCycle(barterCycle != null ? barterCycle : "daily")
			.completed(false)
			.build();

		barter = userTodoBarterRepository.save(barter);
		// flush 후 다시 조회하여 lifeBarter 관계를 로드
		userTodoBarterRepository.flush();
		barter = userTodoBarterRepository.findById(barter.getId()).orElse(barter);
		return UserTodoBarterDto.fromEntity(barter);
	}

	@Transactional
	public void removeBarterItem(Long userId, Long id){
		UserTodoBarter barter = userTodoBarterRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
			.orElseThrow(() -> new RuntimeException("물물교환 아이템을 찾을 수 없습니다."));

		barter.setDeletedAt(LocalDateTime.now());
		userTodoBarterRepository.save(barter);
	}

	@Transactional
	public UserTodoBarterDto toggleComplete(Long userId, Long id){
		UserTodoBarter barter = userTodoBarterRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
			.orElseThrow(() -> new RuntimeException("물물교환 아이템을 찾을 수 없습니다."));

		barter.setCompleted(!barter.getCompleted());
		barter = userTodoBarterRepository.save(barter);
		return UserTodoBarterDto.fromEntity(barter);
	}

	@Transactional
	public void resetDailyCompleted(){
		userTodoBarterRepository.resetCompletedByCycle("daily");
	}

	@Transactional
	public void resetWeeklyCompleted(){
		userTodoBarterRepository.resetAllCompleted();
	}
}
