package com.example.mobinogi.dto.user;

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
	private Integer barterId;
	private String barterCycle;
	private Boolean completed;
	private String itemName;
	private String exchangeItemName;
	private String regionName;
	private String npcName;
	private Integer exchangeCost;
	private Integer barterQty;
	private Integer barterInitCycle;

	public static UserTodoBarterDto fromEntity(UserTodoBarter entity){
		UserTodoBarterDtoBuilder builder = UserTodoBarterDto.builder()
			.id(entity.getId())
			.userId(entity.getUserId())
			.characterId(entity.getCharacterId())
			.barterId(entity.getBarterId())
			.barterCycle(entity.getBarterCycle())
			.completed(entity.getCompleted());

		if(entity.getLifeBarter() != null){
			var barter = entity.getLifeBarter();
			builder.barterQty(barter.getBarterQty());
			builder.exchangeCost(barter.getExchangeCost());
			builder.barterInitCycle(barter.getBarterInitCycle());
			if(barter.getGameItem() != null){
				builder.itemName(barter.getGameItem().getItemName());
			}
			if(barter.getExchangeItem() != null){
				builder.exchangeItemName(barter.getExchangeItem().getItemName());
			}
			if(barter.getGameRegion() != null){
				builder.regionName(barter.getGameRegion().getRegionName());
			}
			if(barter.getGameNpc() != null){
				builder.npcName(barter.getGameNpc().getNpcName());
			}
		}

		return builder.build();
	}
}
