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
	private String serverName;
	private String className;
	private TodoDataDto todoData;
	private LocalDateTime lastDailyReset;
	private LocalDateTime lastWeeklyReset;

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
		String serverName = null;
		String className = null;
		if(entity.getCharacter() != null){
			characterName = entity.getCharacter().getCharacterName();
			serverName = entity.getCharacter().getServerName();
			className = entity.getCharacter().getClassName();
		}

		return UserTodoDto.builder()
			.userId(entity.getUserId())
			.characterId(entity.getCharacterId())
			.characterName(characterName)
			.serverName(serverName)
			.className(className)
			.todoData(todoData)
			.lastDailyReset(entity.getLastDailyReset())
			.lastWeeklyReset(entity.getLastWeeklyReset())
			.build();
	}
}
