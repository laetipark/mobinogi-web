package com.example.mobinogi.service.user;

import com.example.mobinogi.dto.user.UserTodoBarterDto;
import com.example.mobinogi.entity.LifeBarter;
import com.example.mobinogi.entity.UserTodoBarter;
import com.example.mobinogi.repository.LifeBarterRepository;
import com.example.mobinogi.repository.UserTodoBarterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserTodoBarterService{

	private final UserTodoBarterRepository userTodoBarterRepository;
	private final LifeBarterRepository lifeBarterRepository;

	private Integer toBarterInitCycle(String barterCycle){
		if(barterCycle == null){
			return null;
		}
		return switch(barterCycle.toLowerCase()){
			case "daily" -> 1;
			case "weekly" -> 2;
			default -> null;
		};
	}

	private LifeBarter findLifeBarter(String itemName, String exchangeItemName, String npcName, String barterCycle){
		List<LifeBarter> matches = lifeBarterRepository.findByGameItem_ItemNameAndExchangeItem_ItemNameAndGameNpc_NpcName(
			itemName, exchangeItemName, npcName
		);
		if(matches.isEmpty()){
			return null;
		}

		Integer targetCycle = toBarterInitCycle(barterCycle);
		if(targetCycle != null){
			Optional<LifeBarter> cycleMatched = matches.stream()
				.filter(lb -> Objects.equals(lb.getBarterInitCycle(), targetCycle))
				.min(Comparator.comparing(LifeBarter::getBarterId));
			if(cycleMatched.isPresent()){
				return cycleMatched.get();
			}
		}

		return matches.stream().min(Comparator.comparing(LifeBarter::getBarterId)).orElse(null);
	}

	private UserTodoBarterDto toDto(UserTodoBarter entity){
		LifeBarter lb = findLifeBarter(
			entity.getItemName(),
			entity.getExchangeItemName(),
			entity.getNpcName(),
			entity.getBarterCycle()
		);
		return UserTodoBarterDto.fromEntity(entity, lb);
	}

	@Transactional(readOnly = true)
	public List<UserTodoBarterDto> getBarterCart(Long userId, Long characterId){
		return userTodoBarterRepository.findByUserIdAndCharacterIdAndDeletedAtIsNull(userId, characterId)
			.stream()
			.map(this::toDto)
			.collect(Collectors.toList());
	}

	@Transactional
	public UserTodoBarterDto addBarterItem(Long userId, Long characterId, String itemName, String exchangeItemName, String npcName, String regionName, Integer exchangeCost, String barterCycle){
		UserTodoBarter barter = UserTodoBarter.builder()
			.userId(userId)
			.characterId(characterId)
			.itemName(itemName)
			.exchangeItemName(exchangeItemName)
			.npcName(npcName)
			.regionName(regionName != null ? regionName : "")
			.exchangeCost(exchangeCost)
			.barterCycle(barterCycle != null ? barterCycle : "daily")
			.completed(false)
			.build();

		barter = userTodoBarterRepository.save(barter);
		return toDto(barter);
	}

	@Transactional
	public void removeBarterItem(Long userId, Long id){
		UserTodoBarter barter = userTodoBarterRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
			.orElseThrow(() -> new RuntimeException("물물교환 아이템을 찾을 수 없습니다."));

		barter.setDeletedAt(LocalDateTime.now());
		userTodoBarterRepository.save(barter);
	}

	@Transactional
	public UserTodoBarterDto toggleComplete(Long userId, Long characterId, Long id){
		UserTodoBarter barter = userTodoBarterRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
			.orElseThrow(() -> new RuntimeException("물물교환 아이템을 찾을 수 없습니다."));

		barter.setCompleted(!barter.getCompleted());
		userTodoBarterRepository.save(barter);
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
