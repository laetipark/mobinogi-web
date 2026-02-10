package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.UserCharacter;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCharacterDto{

	private Long characterId;
	private Long userId;
	private String characterName;
	private String serverName;
	private String className;
	private Integer displayOrder;
	private LocalDateTime createdAt;

	public static UserCharacterDto fromEntity(UserCharacter character){
		return UserCharacterDto.builder()
			.characterId(character.getCharacterId())
			.userId(character.getUser().getUserId())
			.characterName(character.getCharacterName())
			.serverName(character.getCharacterServer())
			.className(character.getCharacterClass())
			.displayOrder(character.getCharacterOrder())
			.createdAt(character.getCreatedAt())
			.build();
	}
}
