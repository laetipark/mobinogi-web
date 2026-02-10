package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.UserTodo;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserTodoDto{

	private static final ObjectMapper objectMapper = new ObjectMapper();

	private Long userId;
	private Long characterId;
	private String characterName;
	private Integer serverId;
	private String serverName;
	private Long classId;
	private String className;
	private TodoDataDto todoData;
	private LocalDateTime lastDailyReset;
	private LocalDateTime lastWeeklyReset;
	private Integer userPower;
	private Integer userVitality;
	private Integer userAttractiveness;

	public static UserTodoDto fromEntity(UserTodo entity){
		TodoDataDto todoData;
		try{
			if(entity.getTodoData() != null && !entity.getTodoData().isEmpty()){
				todoData = objectMapper.readValue(entity.getTodoData(), TodoDataDto.class);
			}else{
				todoData = TodoDataDto.createDefault();
			}
		}catch(JsonProcessingException e){
			todoData = TodoDataDto.createDefault();
		}

		String characterName = null;
		Integer serverId = null;
		String serverName = null;
		Long classId = null;
		String className = null;
		if(entity.getCharacter() != null){
			characterName = entity.getCharacter().getCharacterName();
			serverId = entity.getCharacter().getCharacterServer();
			serverName = UserCharacterDto.resolveServerName(serverId);
			classId = entity.getCharacter().getCharacterClass();
			if(entity.getCharacter().getGameClass() != null){
				className = entity.getCharacter().getGameClass().getClassName();
			}
		}

		return UserTodoDto.builder()
			.userId(entity.getUserId())
			.characterId(entity.getCharacterId())
			.characterName(characterName)
			.serverId(serverId)
			.serverName(serverName)
			.classId(classId)
			.className(className)
			.todoData(todoData)
			.lastDailyReset(entity.getLastDailyReset())
			.lastWeeklyReset(entity.getLastWeeklyReset())
			.build();
	}
}
