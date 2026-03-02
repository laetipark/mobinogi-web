package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.user.UserCharacter;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * User character DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCharacterDto{

	/** Server-id to display-name mapping. */
	private static final Map<Integer, String> SERVER_NAMES = Map.of(
		1, "데이안", 2, "아이라", 3, "던컨", 4, "알리사",
		5, "메이븐", 6, "라사", 7, "칼릭스"
	);

	/** Character ID. */
	private Long characterId;

	/** Owner user ID. */
	private Long userId;

	/** Character name. */
	private String characterName;

	/** Server ID. */
	private Integer serverId;

	/** Server display name. */
	private String serverName;

	/** Class ID. */
	private Long classId;

	/** Class display name. */
	private String className;

	/** UI display order. */
	private Integer displayOrder;

	/** Character created timestamp. */
	private LocalDateTime createdAt;

	/** Power stat. */
	private Integer userPower;

	/** Vitality stat. */
	private Integer userVitality;

	/** Attractiveness stat. */
	private Integer userAttractiveness;

	/** Last rank-sync timestamp. */
	private LocalDateTime rankUpdatedAt;

	/**
	 * Resolves server ID into display name.
	 *
	 * @param serverId server ID
	 * @return server name or null
	 */
	public static String resolveServerName(Integer serverId){
		if(serverId == null){
			return null;
		}
		return SERVER_NAMES.get(serverId);
	}

	/**
	 * Converts entity to DTO.
	 *
	 * @param character character entity
	 * @return DTO instance
	 */
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
