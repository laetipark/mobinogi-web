package com.example.mobinogi.todo.dto;

import com.example.mobinogi.entity.life.LifeBarter;
import com.example.mobinogi.todo.entity.UserTodoBarter;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserTodoBarterDto{

	/** 물물교환 TODO ID */
	private Long id;

	/** 사용자 ID */
	private Long userId;

	/** 캐릭터 ID */
	private Long characterId;

	/** 보상 아이템명 */
	private String itemName;

	/** 교환 아이템명 */
	private String exchangeItemName;

	/** NPC명 */
	private String npcName;

	/** 지역명 */
	private String regionName;

	/** 교환 비용 */
	private Integer exchangeCost;

	/** 교환 주기 */
	private String barterCycle;

	/** 완료 여부 */
	private Boolean completed;

	/** 완료 수량 */
	private Integer completedCount;

	/** 체크한 사용자 ID */
	private Long checkedByUserId;

	/** 체크한 사용자 닉네임 */
	private String checkedByNickname;

	/** 체크한 캐릭터 ID */
	private Long checkedByCharacterId;

	/** 체크한 캐릭터명 */
	private String checkedByCharacterName;

	/** 체크 시각 문자열 */
	private String checkedAt;

	/** 최대 교환 가능 수량 */
	private Integer barterQty;

	/** 초기화 주기 코드 */
	private Integer barterInitCycle;

	/** 서버 공유 여부 */
	private Integer barterServer;

	/** NPC 공유 여부 */
	private Integer barterNpc;

	/**
	 * 완료 수량 값을 안전한 범위로 정규화합니다.
	 *
	 * @param entity 원본 엔티티
	 * @param maxQty 최대 수량
	 * @return 정규화된 완료 수량
	 */
	private static int resolveCompletedCount(UserTodoBarter entity, Integer maxQty){
		Integer rawCount = entity.getCompletedCount();
		int fallback = Boolean.TRUE.equals(entity.getCompleted()) ? 1 : 0;
		int normalized = rawCount != null ? Math.max(0, rawCount) : fallback;
		if(maxQty == null || maxQty <= 0){
			return normalized;
		}
		return Math.min(maxQty, normalized);
	}

	/**
	 * 엔티티만으로 DTO를 생성합니다.
	 *
	 * @param entity 원본 엔티티
	 * @return 응답 DTO
	 */
	public static UserTodoBarterDto fromEntity(UserTodoBarter entity){
		int completedCount = resolveCompletedCount(entity, null);
		return UserTodoBarterDto.builder()
			.id(entity.getId())
			.userId(entity.getUserId())
			.characterId(entity.getCharacterId())
			.itemName(entity.getItemName())
			.exchangeItemName(entity.getExchangeItemName())
			.npcName(entity.getNpcName())
			.regionName(entity.getRegionName())
			.exchangeCost(entity.getExchangeCost())
			.barterCycle(entity.getBarterCycle())
			.completed(Boolean.TRUE.equals(entity.getCompleted()))
			.completedCount(completedCount)
			.checkedByUserId(entity.getCheckedByUserId())
			.checkedByNickname(entity.getCheckedByNickname())
			.checkedByCharacterId(entity.getCheckedByCharacterId())
			.checkedByCharacterName(entity.getCheckedByCharacterName())
			.checkedAt(entity.getCheckedAt() != null ? entity.getCheckedAt().toString() : null)
			.build();
	}

	/**
	 * 마스터 데이터와 결합해 DTO를 생성합니다.
	 *
	 * @param entity 원본 엔티티
	 * @param lifeBarter 물물교환 마스터 데이터
	 * @return 응답 DTO
	 */
	public static UserTodoBarterDto fromEntity(UserTodoBarter entity, LifeBarter lifeBarter){
		Integer maxQty = lifeBarter != null ? lifeBarter.getBarterQty() : null;
		int completedCount = resolveCompletedCount(entity, maxQty);
		boolean completed = maxQty != null && maxQty > 0
			? completedCount >= maxQty
			: Boolean.TRUE.equals(entity.getCompleted());

		UserTodoBarterDtoBuilder builder = UserTodoBarterDto.builder()
			.id(entity.getId())
			.userId(entity.getUserId())
			.characterId(entity.getCharacterId())
			.itemName(entity.getItemName())
			.exchangeItemName(entity.getExchangeItemName())
			.npcName(entity.getNpcName())
			.regionName(entity.getRegionName())
			.exchangeCost(entity.getExchangeCost())
			.barterCycle(entity.getBarterCycle())
			.completed(completed)
			.completedCount(completedCount)
			.checkedByUserId(entity.getCheckedByUserId())
			.checkedByNickname(entity.getCheckedByNickname())
			.checkedByCharacterId(entity.getCheckedByCharacterId())
			.checkedByCharacterName(entity.getCheckedByCharacterName())
			.checkedAt(entity.getCheckedAt() != null ? entity.getCheckedAt().toString() : null);

		if(lifeBarter != null){
			builder.barterQty(lifeBarter.getBarterQty());
			builder.barterInitCycle(lifeBarter.getBarterInitCycle());
			builder.barterServer(lifeBarter.getBarterServer());
			builder.barterNpc(lifeBarter.getBarterNpc());
		}

		return builder.build();
	}
}


