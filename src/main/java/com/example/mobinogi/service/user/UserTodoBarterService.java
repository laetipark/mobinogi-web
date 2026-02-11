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

	private LifeBarter findLifeBarter(String itemName, String exchangeItemName, String npcName){
		return lifeBarterRepository.findByGameItem_ItemNameAndExchangeItem_ItemNameAndGameNpc_NpcName(
			itemName, exchangeItemName, npcName
		).orElse(null);
	}

	private UserTodoBarterDto toDto(UserTodoBarter entity){
		LifeBarter lb = findLifeBarter(entity.getItemName(), entity.getExchangeItemName(), entity.getNpcName());
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
	public List<UserTodoBarterDto> toggleComplete(Long userId, Long characterId, Long id){
		UserTodoBarter barter = userTodoBarterRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
			.orElseThrow(() -> new RuntimeException("물물교환 아이템을 찾을 수 없습니다."));

		boolean newCompleted = !barter.getCompleted();
		barter.setCompleted(newCompleted);
		userTodoBarterRepository.save(barter);

		List<UserTodoBarter> affected = new ArrayList<>();
		affected.add(barter);

		LifeBarter lifeBarter = findLifeBarter(barter.getItemName(), barter.getExchangeItemName(), barter.getNpcName());

		if(lifeBarter != null){
			// barter_server 공유: 같은 유저의 모든 캐릭터
			if(lifeBarter.getBarterServer() != null){
				List<LifeBarter> sharedBarters = lifeBarterRepository.findByBarterServer(lifeBarter.getBarterServer());
				for(LifeBarter shared : sharedBarters){
					String sItemName = shared.getGameItem() != null ? shared.getGameItem().getItemName() : null;
					String sExchangeName = shared.getExchangeItem() != null ? shared.getExchangeItem().getItemName() : null;
					String sNpcName = shared.getGameNpc() != null ? shared.getGameNpc().getNpcName() : null;
					if(sItemName == null || sExchangeName == null || sNpcName == null) continue;

					List<UserTodoBarter> matches = userTodoBarterRepository
						.findByUserIdAndItemNameAndExchangeItemNameAndNpcNameAndDeletedAtIsNull(
							userId, sItemName, sExchangeName, sNpcName);
					for(UserTodoBarter b : matches){
						if(!b.getId().equals(barter.getId())){
							b.setCompleted(newCompleted);
							userTodoBarterRepository.save(b);
							affected.add(b);
						}
					}
				}
			}

			// barter_npc 공유: 같은 캐릭터만
			if(lifeBarter.getBarterNpc() != null){
				List<LifeBarter> npcBarters = lifeBarterRepository.findByBarterNpc(lifeBarter.getBarterNpc());
				for(LifeBarter shared : npcBarters){
					String sItemName = shared.getGameItem() != null ? shared.getGameItem().getItemName() : null;
					String sExchangeName = shared.getExchangeItem() != null ? shared.getExchangeItem().getItemName() : null;
					String sNpcName = shared.getGameNpc() != null ? shared.getGameNpc().getNpcName() : null;
					if(sItemName == null || sExchangeName == null || sNpcName == null) continue;

					List<UserTodoBarter> matches = userTodoBarterRepository
						.findByUserIdAndCharacterIdAndItemNameAndExchangeItemNameAndNpcNameAndDeletedAtIsNull(
							userId, characterId, sItemName, sExchangeName, sNpcName);
					for(UserTodoBarter b : matches){
						if(!b.getId().equals(barter.getId()) && affected.stream().noneMatch(a -> a.getId().equals(b.getId()))){
							b.setCompleted(newCompleted);
							userTodoBarterRepository.save(b);
							affected.add(b);
						}
					}
				}
			}
		}

		return affected.stream().map(this::toDto).collect(Collectors.toList());
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
