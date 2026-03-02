package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.game.GameMonster;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Game monster DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameMonsterDto{

	/** Monster ID. */
	private Long monsterId;

	/** Region ID. */
	private Long regionId;

	/** Region name. */
	private String regionName;

	/** Monster type. */
	private String monsterType;

	/** Difficulty label. */
	private String monsterDifficulty;

	/** Monster name. */
	private String monsterName;

	/** Required level. */
	private Integer requiredLevel;

	/** Required power. */
	private Integer powerRequired;

	/** Recommended power. */
	private Integer powerRecommended;

	/** Overwhelming power threshold. */
	private Integer powerOverwhelming;

	/** Party revive count. */
	private Integer partyRevives;

	/**
	 * Converts entity to DTO.
	 *
	 * @param monster monster entity
	 * @return DTO instance
	 */
	public static GameMonsterDto fromEntity(GameMonster monster){
		return GameMonsterDto.builder()
			.monsterId(monster.getMonsterId())
			.regionId(monster.getRegionId())
			.regionName(monster.getGameRegion() != null ? monster.getGameRegion().getRegionName() : null)
			.monsterType(monster.getMonsterType())
			.monsterDifficulty(monster.getMonsterDifficulty())
			.monsterName(monster.getMonsterName())
			.requiredLevel(monster.getRequiredLevel())
			.powerRequired(monster.getPowerRequired())
			.powerRecommended(monster.getPowerRecommended())
			.powerOverwhelming(monster.getPowerOverwhelming())
			.partyRevives(monster.getPartyRevives())
			.build();
	}
}
