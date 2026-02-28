package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.LifeBarter;
import com.example.mobinogi.entity.UserTodoBarter;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserTodoBarterDto{

	private Long id;
	private Long userId;
	private Long characterId;
	private String itemName;
	private String exchangeItemName;
	private String npcName;
	private String regionName;
	private Integer exchangeCost;
	private String barterCycle;
	private Boolean completed;
	private Integer completedCount;
	private Long checkedByUserId;
	private String checkedByNickname;
	private Long checkedByCharacterId;
	private String checkedByCharacterName;
	private String checkedAt;
	private Integer barterQty;
	private Integer barterInitCycle;
	private Integer barterServer;
	private Integer barterNpc;

	private static int resolveCompletedCount(UserTodoBarter entity, Integer maxQty){
		Integer rawCount = entity.getCompletedCount();
		int fallback = Boolean.TRUE.equals(entity.getCompleted()) ? 1 : 0;
		int normalized = rawCount != null ? Math.max(0, rawCount) : fallback;
		if(maxQty == null || maxQty <= 0){
			return normalized;
		}
		return Math.min(maxQty, normalized);
	}

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
