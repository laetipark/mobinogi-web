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
	
	@Transactional(readOnly = true)
	public List<UserTodoBarterDto> getBarterCart(Long userId, Long characterId){
		return userTodoBarterRepository.findByUserIdAndCharacterIdAndDeletedAtIsNull(userId, characterId)
			.stream()
			.map(UserTodoBarterDto::fromEntity)
			.collect(Collectors.toList());
	}
	
	@Transactional
	public UserTodoBarterDto addBarterItem(Long userId, Long characterId, Long barterId, String barterCycle){
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
	public List<UserTodoBarterDto> toggleComplete(Long userId, Long characterId, Long id){
		UserTodoBarter barter = userTodoBarterRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
			.orElseThrow(() -> new RuntimeException("물물교환 아이템을 찾을 수 없습니다."));
		
		boolean newCompleted = !barter.getCompleted();
		barter.setCompleted(newCompleted);
		userTodoBarterRepository.save(barter);
		
		List<UserTodoBarter> affected = new ArrayList<>();
		affected.add(barter);
		
		LifeBarter lifeBarter = lifeBarterRepository.findById(barter.getBarterId()).orElse(null);
		if(lifeBarter != null){
			// barter_server 공유: 같은 유저의 모든 캐릭터
			if(lifeBarter.getBarterServer() != null){
				List<LifeBarter> sharedBarters = lifeBarterRepository.findByBarterServer(lifeBarter.getBarterServer());
				List<Long> sharedIds = sharedBarters.stream().map(LifeBarter::getBarterId).collect(Collectors.toList());
				// 자기 자신의 barterId도 포함
				Long barterServerLong = lifeBarter.getBarterServer().longValue();
				if(!sharedIds.contains(barterServerLong)){
					sharedIds.add(barterServerLong);
				}
				List<UserTodoBarter> serverShared = userTodoBarterRepository.findByUserIdAndBarterIdInAndDeletedAtIsNull(userId, sharedIds);
				for(UserTodoBarter b : serverShared){
					if(!b.getId().equals(barter.getId())){
						b.setCompleted(newCompleted);
						userTodoBarterRepository.save(b);
						affected.add(b);
					}
				}
			}

			// barter_npc 공유: 같은 캐릭터만
			if(lifeBarter.getBarterNpc() != null){
				List<LifeBarter> npcBarters = lifeBarterRepository.findByBarterNpc(lifeBarter.getBarterNpc());
				List<Long> npcIds = npcBarters.stream().map(LifeBarter::getBarterId).collect(Collectors.toList());
				Long barterNpcLong = lifeBarter.getBarterNpc().longValue();
				if(!npcIds.contains(barterNpcLong)){
					npcIds.add(barterNpcLong);
				}
				List<UserTodoBarter> npcShared = userTodoBarterRepository.findByUserIdAndCharacterIdAndBarterIdInAndDeletedAtIsNull(userId, characterId, npcIds);
				for(UserTodoBarter b : npcShared){
					if(!b.getId().equals(barter.getId()) && !affected.contains(b)){
						b.setCompleted(newCompleted);
						userTodoBarterRepository.save(b);
						affected.add(b);
					}
				}
			}
		}
		
		return affected.stream().map(UserTodoBarterDto::fromEntity).collect(Collectors.toList());
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
