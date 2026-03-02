package com.example.mobinogi.todo.dto;

import com.example.mobinogi.dto.user.UserCharacterDto;
import com.example.mobinogi.todo.entity.UserTodo;
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

	/** JSON todoData 직렬화/역직렬화 처리기 */
	private static final ObjectMapper objectMapper = new ObjectMapper();

	/** 사용자 ID */
	private Long userId;

	/** 캐릭터 ID */
	private Long characterId;

	/** 캐릭터명 */
	private String characterName;

	/** 서버 ID */
	private Integer serverId;

	/** 서버명 */
	private String serverName;

	/** 클래스 ID */
	private Long classId;

	/** 클래스명 */
	private String className;

	/** TODO 상세 데이터 */
	private TodoDataDto todoData;

	/** 마지막 일일 리셋 시각 */
	private LocalDateTime lastDailyReset;

	/** 마지막 주간 리셋 시각 */
	private LocalDateTime lastWeeklyReset;

	/** 전투력 */
	private Integer userPower;

	/** 생활력 */
	private Integer userVitality;

	/** 매력 */
	private Integer userAttractiveness;

	/** 랭크 정보 갱신 시각 */
	private LocalDateTime rankUpdatedAt;

	/**
	 * 엔티티를 응답 DTO로 변환합니다.
	 *
	 * @param entity UserTodo 엔티티
	 * @return 응답 DTO
	 */
	public static UserTodoDto fromEntity(UserTodo entity){
		TodoDataDto todoData;
		try{
			// 저장된 JSON이 없으면 기본 템플릿으로 초기화합니다.
			if(entity.getTodoData() != null && !entity.getTodoData().isEmpty()){
				todoData = objectMapper.readValue(entity.getTodoData(), TodoDataDto.class);
			}else{
				todoData = TodoDataDto.createDefault();
			}
		}catch(JsonProcessingException e){
			// 역직렬화 실패 시에도 화면이 깨지지 않도록 기본값을 사용합니다.
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


