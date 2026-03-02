package com.example.mobinogi.todo.service;

import com.example.mobinogi.todo.dto.UserTodoBarterDto;
import com.example.mobinogi.entity.life.LifeBarter;
import com.example.mobinogi.entity.user.User;
import com.example.mobinogi.entity.user.UserCharacter;
import com.example.mobinogi.todo.entity.UserTodoBarter;
import com.example.mobinogi.repository.LifeBarterRepository;
import com.example.mobinogi.repository.UserCharacterRepository;
import com.example.mobinogi.repository.UserRepository;
import com.example.mobinogi.todo.repository.UserTodoBarterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserTodoBarterService{

	/** 사용자 물물교환 TODO 리포지토리 */
	private final UserTodoBarterRepository userTodoBarterRepository;

	/** 원본 물물교환 마스터 데이터 리포지토리 */
	private final LifeBarterRepository lifeBarterRepository;

	/** 사용자 캐릭터 리포지토리 */
	private final UserCharacterRepository userCharacterRepository;

	/** 사용자 리포지토리 */
	private final UserRepository userRepository;

	/**
	 * 문자열 사이클 값을 DB 초기화 사이클 코드로 변환합니다.
	 *
	 * @param barterCycle 사이클 문자열
	 * @return 사이클 코드
	 */
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

	/**
	 * 조건에 맞는 물물교환 마스터 데이터를 조회합니다.
	 *
	 * @param itemName 보상 아이템명
	 * @param exchangeItemName 교환 아이템명
	 * @param npcName NPC명
	 * @param barterCycle 사이클 문자열
	 * @return 매칭된 LifeBarter 또는 null
	 */
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

	/**
	 * 엔티티를 응답 DTO로 변환합니다.
	 *
	 * @param entity 물물교환 TODO 엔티티
	 * @return 응답 DTO
	 */
	private UserTodoBarterDto toDto(UserTodoBarter entity){
		LifeBarter lb = findLifeBarter(
			entity.getItemName(),
			entity.getExchangeItemName(),
			entity.getNpcName(),
			entity.getBarterCycle()
		);
		return UserTodoBarterDto.fromEntity(entity, lb);
	}

	/**
	 * 서버 공유형 물물교환인지 판별합니다.
	 */
	private boolean isServerSharedBarter(LifeBarter lifeBarter){
		return lifeBarter != null && Integer.valueOf(1).equals(lifeBarter.getBarterServer());
	}

	/**
	 * 교환 가능 최대 수량을 안전하게 계산합니다.
	 */
	private int getSafeBarterQty(LifeBarter lifeBarter){
		if(lifeBarter == null || lifeBarter.getBarterQty() == null){
			return 1;
		}
		return Math.max(1, lifeBarter.getBarterQty());
	}

	/**
	 * 완료 수량을 저장 가능한 범위로 정규화합니다.
	 */
	private int resolveCompletedCount(UserTodoBarter barter, int maxQty){
		Integer rawCount = barter.getCompletedCount();
		int fallback = Boolean.TRUE.equals(barter.getCompleted()) ? maxQty : 0;
		int normalized = rawCount != null ? Math.max(0, rawCount) : fallback;
		return Math.min(maxQty, normalized);
	}

	/**
	 * 서버 공유 여부에 따라 상태 동기화 대상 캐릭터 ID 목록을 계산합니다.
	 */
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

	/**
	 * 새 물물교환 TODO 엔티티를 생성합니다.
	 */
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
			.completedCount(0)
			.build();
	}

	/**
	 * 체크 상태(완료 여부/완료 수량/체크 메타데이터)를 반영합니다.
	 */
	private void applyCheckedState(
		UserTodoBarter barter,
		int completedCount,
		int maxQty,
		Long checkedByUserId,
		String checkedByNickname,
		Long checkedByCharacterId,
		String checkedByCharacterName
	){
		int clampedCount = Math.max(0, Math.min(maxQty, completedCount));
		barter.setCompletedCount(clampedCount);
		boolean completed = clampedCount >= maxQty;
		barter.setCompleted(completed);
		if(clampedCount > 0){
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

	/**
	 * 캐릭터별 물물교환 장바구니를 조회합니다.
	 */
	@Transactional(readOnly = true)
	public List<UserTodoBarterDto> getBarterCart(Long userId, Long characterId){
		return userTodoBarterRepository.findByUserIdAndCharacterIdAndDeletedAtIsNull(userId, characterId)
			.stream()
			.map(this::toDto)
			.collect(Collectors.toList());
	}

	/**
	 * 물물교환 항목을 장바구니에 추가합니다.
	 * 서버 공유형일 경우 같은 서버 캐릭터에도 동기화 생성합니다.
	 */
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

	/**
	 * 물물교환 항목을 삭제(soft delete)합니다.
	 */
	@Transactional
	public void removeBarterItem(Long userId, Long id){
		UserTodoBarter barter = userTodoBarterRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
			.orElseThrow(() -> new RuntimeException("물물교환 아이템을 찾을 수 없습니다."));

		barter.setDeletedAt(LocalDateTime.now());
		userTodoBarterRepository.save(barter);
	}

	/**
	 * 물물교환 항목의 완료 상태/수량을 토글합니다.
	 * 서버 공유형일 경우 관련 캐릭터에도 동일 상태를 반영합니다.
	 */
	@Transactional
	public UserTodoBarterDto toggleComplete(Long userId, Long characterId, Long id, Integer requestedCompletedCount){
		UserTodoBarter barter = userTodoBarterRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
			.orElseThrow(() -> new RuntimeException("물물교환 아이템을 찾을 수 없습니다."));

		LifeBarter lifeBarter = findLifeBarter(
			barter.getItemName(),
			barter.getExchangeItemName(),
			barter.getNpcName(),
			barter.getBarterCycle()
		);
		boolean serverShared = isServerSharedBarter(lifeBarter);
		int maxQty = getSafeBarterQty(lifeBarter);

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

		int nextCompletedCount;
		if(requestedCompletedCount != null){
			nextCompletedCount = Math.max(0, Math.min(maxQty, requestedCompletedCount));
		}else{
			int currentCompletedCount = resolveCompletedCount(barter, maxQty);
			nextCompletedCount = currentCompletedCount > 0 ? 0 : maxQty;
		}

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
				nextCompletedCount,
				maxQty,
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

	/**
	 * 일일 주기 항목 완료 상태를 리셋합니다.
	 */
	@Transactional
	public void resetDailyCompleted(){
		userTodoBarterRepository.resetCompletedByCycle("daily");
	}

	/**
	 * 전체 물물교환 완료 상태를 리셋합니다.
	 */
	@Transactional
	public void resetWeeklyCompleted(){
		userTodoBarterRepository.resetAllCompleted();
	}
}


