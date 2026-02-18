package com.example.mobinogi.service.user;

import com.example.mobinogi.dto.user.UserTodoBarterDto;
import com.example.mobinogi.entity.LifeBarter;
import com.example.mobinogi.entity.User;
import com.example.mobinogi.entity.UserCharacter;
import com.example.mobinogi.entity.UserTodoBarter;
import com.example.mobinogi.repository.LifeBarterRepository;
import com.example.mobinogi.repository.UserCharacterRepository;
import com.example.mobinogi.repository.UserRepository;
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
	private final UserCharacterRepository userCharacterRepository;
	private final UserRepository userRepository;

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

	private boolean isServerSharedBarter(LifeBarter lifeBarter){
		return lifeBarter != null && Integer.valueOf(1).equals(lifeBarter.getBarterServer());
	}

	private List<Long> resolveTargetCharacterIds(Long userId, Long sourceCharacterId, boolean serverShared){
		if(!serverShared){
			return List.of(sourceCharacterId);
		}

		List<UserCharacter> characters = userCharacterRepository.findByUser_UserIdAndDeletedAtIsNullOrderByCharacterOrderAsc(userId);
		if(characters.isEmpty()){
			return List.of(sourceCharacterId);
		}

		Optional<UserCharacter> sourceCharacterOpt = characters.stream()
			.filter(character -> Objects.equals(character.getCharacterId(), sourceCharacterId))
			.findFirst();
		if(sourceCharacterOpt.isEmpty()){
			return List.of(sourceCharacterId);
		}

		Integer sourceServer = sourceCharacterOpt.get().getCharacterServer();
		List<Long> targetIds = characters.stream()
			.filter(character -> sourceServer == null || Objects.equals(character.getCharacterServer(), sourceServer))
			.map(UserCharacter::getCharacterId)
			.toList();
		if(targetIds.isEmpty()){
			return List.of(sourceCharacterId);
		}
		return targetIds;
	}

	private UserTodoBarter newBarterEntity(
		Long userId,
		Long characterId,
		String itemName,
		String exchangeItemName,
		String npcName,
		String regionName,
		Integer exchangeCost,
		String barterCycle
	){
		return UserTodoBarter.builder()
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
	}

	private void applyCheckedState(
		UserTodoBarter barter,
		boolean completed,
		Long checkedByUserId,
		String checkedByNickname,
		Long checkedByCharacterId,
		String checkedByCharacterName
	){
		barter.setCompleted(completed);
		if(completed){
			barter.setCheckedByUserId(checkedByUserId);
			barter.setCheckedByNickname(checkedByNickname);
			barter.setCheckedByCharacterId(checkedByCharacterId);
			barter.setCheckedByCharacterName(checkedByCharacterName);
			barter.setCheckedAt(LocalDateTime.now());
		}else{
			barter.setCheckedByUserId(null);
			barter.setCheckedByNickname(null);
			barter.setCheckedByCharacterId(null);
			barter.setCheckedByCharacterName(null);
			barter.setCheckedAt(null);
		}
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
		userCharacterRepository.findByCharacterIdAndUser_UserIdAndDeletedAtIsNull(characterId, userId)
			.orElseThrow(() -> new RuntimeException("캐릭터 정보를 찾을 수 없습니다."));

		String normalizedCycle = barterCycle != null ? barterCycle : "daily";
		LifeBarter lifeBarter = findLifeBarter(itemName, exchangeItemName, npcName, normalizedCycle);
		boolean serverShared = isServerSharedBarter(lifeBarter);
		List<Long> targetCharacterIds = new ArrayList<>(resolveTargetCharacterIds(userId, characterId, serverShared));
		if(!targetCharacterIds.contains(characterId)){
			targetCharacterIds.add(characterId);
		}

		UserTodoBarter selectedCharacterBarter = null;
		List<UserTodoBarter> toCreate = new ArrayList<>();

		for(Long targetCharacterId : targetCharacterIds){
			List<UserTodoBarter> existing = userTodoBarterRepository
				.findByUserIdAndCharacterIdAndItemNameAndExchangeItemNameAndNpcNameAndDeletedAtIsNull(
					userId, targetCharacterId, itemName, exchangeItemName, npcName
				);
			if(!existing.isEmpty()){
				if(Objects.equals(targetCharacterId, characterId)){
					selectedCharacterBarter = existing.get(0);
				}
				continue;
			}

			UserTodoBarter newBarter = newBarterEntity(
				userId,
				targetCharacterId,
				itemName,
				exchangeItemName,
				npcName,
				regionName,
				exchangeCost,
				normalizedCycle
			);
			toCreate.add(newBarter);
			if(Objects.equals(targetCharacterId, characterId)){
				selectedCharacterBarter = newBarter;
			}
		}

		if(!toCreate.isEmpty()){
			List<UserTodoBarter> created = userTodoBarterRepository.saveAll(toCreate);
			if(selectedCharacterBarter != null && selectedCharacterBarter.getId() == null){
				Long selectedId = selectedCharacterBarter.getCharacterId();
				selectedCharacterBarter = created.stream()
					.filter(item -> Objects.equals(item.getCharacterId(), selectedId))
					.findFirst()
					.orElse(selectedCharacterBarter);
			}
		}

		if(selectedCharacterBarter == null){
			throw new RuntimeException("물물교환 아이템을 추가하지 못했습니다.");
		}

		return toDto(selectedCharacterBarter);
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

		LifeBarter lifeBarter = findLifeBarter(
			barter.getItemName(),
			barter.getExchangeItemName(),
			barter.getNpcName(),
			barter.getBarterCycle()
		);
		boolean serverShared = isServerSharedBarter(lifeBarter);

		List<UserTodoBarter> targetBarters;
		if(serverShared){
			List<Long> targetCharacterIds = new ArrayList<>(resolveTargetCharacterIds(userId, characterId, true));
			if(!targetCharacterIds.contains(barter.getCharacterId())){
				targetCharacterIds.add(barter.getCharacterId());
			}
			targetBarters = userTodoBarterRepository
				.findByUserIdAndCharacterIdInAndItemNameAndExchangeItemNameAndNpcNameAndDeletedAtIsNull(
					userId,
					targetCharacterIds,
					barter.getItemName(),
					barter.getExchangeItemName(),
					barter.getNpcName()
				);
			if(targetBarters.isEmpty()){
				targetBarters = new ArrayList<>(List.of(barter));
			}
		}else{
			targetBarters = new ArrayList<>(List.of(barter));
		}

		boolean nextCompleted = !barter.getCompleted();
		String checkedByNickname = userRepository.findByUserIdAndDeletedAtIsNull(userId)
			.map(User::getNickname)
			.orElse(null);
		UserCharacter checkedByCharacter = userCharacterRepository.findByCharacterIdAndUser_UserIdAndDeletedAtIsNull(characterId, userId)
			.orElse(null);
		String checkedByCharacterName = checkedByCharacter != null ? checkedByCharacter.getCharacterName() : null;
		Long checkedByCharacterId = checkedByCharacter != null ? checkedByCharacter.getCharacterId() : characterId;

		for(UserTodoBarter target : targetBarters){
			applyCheckedState(
				target,
				nextCompleted,
				userId,
				checkedByNickname,
				checkedByCharacterId,
				checkedByCharacterName
			);
		}
		userTodoBarterRepository.saveAll(targetBarters);

		UserTodoBarter updated = targetBarters.stream()
			.filter(item -> Objects.equals(item.getId(), id))
			.findFirst()
			.orElse(barter);
		return toDto(updated);
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
