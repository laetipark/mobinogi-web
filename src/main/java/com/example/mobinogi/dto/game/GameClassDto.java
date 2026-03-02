package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.game.GameClass;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Game class DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameClassDto{

	/** Class ID. */
	private Long classId;

	/** Class code. */
	private String classCode;

	/** Class name. */
	private String className;

	/** Apprentice flag. */
	private Boolean isApprentice;

	/**
	 * Converts entity to DTO.
	 *
	 * @param gameClass class entity
	 * @return DTO instance
	 */
	public static GameClassDto fromEntity(GameClass gameClass){
		return GameClassDto.builder()
			.classId(gameClass.getClassId())
			.classCode(gameClass.getClassCode())
			.className(gameClass.getClassName())
			.isApprentice(gameClass.getIsApprentice())
			.build();
	}
}
