package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.GameMonster;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameMonsterDto{

	private Long monsterId;
	private Long regionId;
	private String regionName;
	private String monsterType;
	private String monsterDifficulty;
	private String monsterName;

	public static GameMonsterDto fromEntity(GameMonster monster){
		return GameMonsterDto.builder()
			.monsterId(monster.getMonsterId())
			.regionId(monster.getRegionId())
			.regionName(monster.getGameRegion() != null ? monster.getGameRegion().getRegionName() : null)
			.monsterType(monster.getMonsterType())
			.monsterDifficulty(monster.getMonsterDifficulty())
			.monsterName(monster.getMonsterName())
			.build();
	}
}
