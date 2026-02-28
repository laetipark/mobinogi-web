package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.UserCharacter;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCharacterDto{

	private static final Map<Integer, String> SERVER_NAMES = Map.of(
		1, "데이안", 2, "아이라", 3, "던컨", 4, "알리사",
		5, "메이븐", 6, "라사", 7, "칼릭스"
	);

	private Long characterId;
	private Long userId;
	private String characterName;
	private Integer serverId;
	private String serverName;
	private Long classId;
	private String className;
	private Integer displayOrder;
	private LocalDateTime createdAt;
	private Integer userPower;
	private Integer userVitality;
	private Integer userAttractiveness;
	private LocalDateTime rankUpdatedAt;

	public static String resolveServerName(Integer serverId){
		if(serverId == null) return null;
		return SERVER_NAMES.get(serverId);
	}

	public static UserCharacterDto fromEntity(UserCharacter character){
		String className = null;
		if(character.getGameClass() != null){
			className = character.getGameClass().getClassName();
		}

		return UserCharacterDto.builder()
			.characterId(character.getCharacterId())
			.userId(character.getUser().getUserId())
			.characterName(character.getCharacterName())
			.serverId(character.getCharacterServer())
			.serverName(resolveServerName(character.getCharacterServer()))
			.classId(character.getCharacterClass())
			.className(className)
			.displayOrder(character.getCharacterOrder())
			.createdAt(character.getCreatedAt())
			.build();
	}
}
