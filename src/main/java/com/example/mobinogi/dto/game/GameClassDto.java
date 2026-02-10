package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.GameClass;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameClassDto{

	private Long classId;
	private String classCode;
	private String className;
	private Boolean isApprentice;

	public static GameClassDto fromEntity(GameClass gameClass){
		return GameClassDto.builder()
			.classId(gameClass.getClassId())
			.classCode(gameClass.getClassCode())
			.className(gameClass.getClassName())
			.isApprentice(gameClass.getIsApprentice())
			.build();
	}
}
