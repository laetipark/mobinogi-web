package com.example.mobinogi.todo.service;

import com.example.mobinogi.todo.dto.TodoDataDto;
import com.example.mobinogi.dto.user.UserCharacterDto;
import com.example.mobinogi.todo.dto.UserTodoDto;
import com.example.mobinogi.todo.dto.UserTodoUpdateRequest;
import com.example.mobinogi.entity.user.UserCharacter;

import com.example.mobinogi.todo.entity.UserTodo;
import com.example.mobinogi.repository.UserCharacterRepository;
import com.example.mobinogi.repository.UserRankRepository;
import com.example.mobinogi.todo.repository.UserTodoRepository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserTodoService{

	/** 사용자 TODO 데이터 접근 리포지토리 */
	private final UserTodoRepository userTodoRepository;

	/** 사용자 캐릭터 데이터 접근 리포지토리 */
	private final UserCharacterRepository userCharacterRepository;

	/** 랭크 캐시 데이터 접근 리포지토리 */
	private final UserRankRepository userRankRepository;

	/** JSON 직렬화/역직렬화 처리기 */
	private final ObjectMapper objectMapper;
	
	/** 한국 표준시 기준 타임존 */
	private static final ZoneId KST = ZoneId.of("Asia/Seoul");
	
	/**
	 * 사용자의 캐릭터별 TODO 목록을 조회합니다.
	 *
	 * @param userId 사용자 ID
	 * @return 캐릭터별 TODO DTO 목록
	 */
	@Transactional(readOnly = true)
	public List<UserTodoDto> getTodosByUserId(Long userId){
		List<UserTodo> todos = userTodoRepository.findByUserIdAndDeletedAtIsNull(userId);
		
		// 등록된 캐릭터 목록을 기준으로 TODO 목록을 구성
		List<UserCharacter> characters = userCharacterRepository.findByUser_UserIdAndDeletedAtIsNullOrderByCharacterOrderAsc(userId);
		
		List<UserTodoDto> result = new ArrayList<>();
		for(UserCharacter character : characters){
			UserTodo todo = todos.stream()
				.filter(t -> t.getCharacterId().equals(character.getCharacterId()))
				.findFirst()
				.orElse(null);

			UserTodoDto dto;
			if(todo != null){
				checkAndApplyLazyReset(todo);
				migrateOldData(todo);
				dto = UserTodoDto.fromEntity(todo);
			}else{
				// TODO 데이터가 없으면 기본값 DTO를 생성
				String className = null;
				if(character.getGameClass() != null){
					className = character.getGameClass().getClassName();
				}
				dto = UserTodoDto.builder()
					.userId(userId)
					.characterId(character.getCharacterId())
					.characterName(character.getCharacterName())
					.serverId(character.getCharacterServer())
					.serverName(UserCharacterDto.resolveServerName(character.getCharacterServer()))
					.classId(character.getCharacterClass())
					.className(className)
					.todoData(TodoDataDto.createDefault())
					.build();
			}

			// 랭크 정보가 있으면 함께 반환
			if(character.getCharacterServer() != null){
				var rankOpt = userRankRepository.findLatestActiveByServerIdAndUserName(character.getCharacterServer(), character.getCharacterName());
				if(rankOpt.isPresent()){
					var rank = rankOpt.get();
					dto.setUserPower(rank.getUserPower());
					dto.setUserVitality(rank.getUserVitality());
					dto.setUserAttractiveness(rank.getUserAttractiveness());
					dto.setRankUpdatedAt(rank.getUpdatedAt());
				}
			}

			result.add(dto);
		}

		return result;
	}
	
	/**
	 * 특정 캐릭터의 TODO 데이터를 생성 또는 수정합니다.
	 *
	 * @param userId 사용자 ID
	 * @param characterId 캐릭터 ID
	 * @param request 수정 요청 데이터
	 * @return 저장된 TODO DTO
	 */
	@Transactional
	public UserTodoDto updateTodo(Long userId, Long characterId, UserTodoUpdateRequest request){
		UserTodo todo = userTodoRepository.findByUserIdAndCharacterIdAndDeletedAtIsNull(userId, characterId)
			.orElse(null);
		
		if(todo == null){
			// 캐릭터 존재 여부 확인
			userCharacterRepository.findByCharacterIdAndUser_UserIdAndDeletedAtIsNull(characterId, userId)
				.orElseThrow(() -> new RuntimeException("캐릭터를 찾을 수 없습니다."));
			
			todo = new UserTodo();
			todo.setUserId(userId);
			todo.setCharacterId(characterId);
			
			LocalDateTime now = LocalDateTime.now(KST);
			todo.setLastDailyReset(now);
			todo.setLastWeeklyReset(now);
		}
		
		try{
			String jsonData = objectMapper.writeValueAsString(request.getTodoData());
			todo.setTodoData(jsonData);
		}catch(JsonProcessingException e){
			throw new RuntimeException("할 일 데이터를 저장하지 못했습니다.");
		}
		
		todo = userTodoRepository.save(todo);
		return UserTodoDto.fromEntity(todo);
	}
	
	/**
	 * 전체 TODO의 일일 항목을 리셋합니다.
	 */
	@Transactional
	public void resetDaily(){
		List<UserTodo> todos = userTodoRepository.findByDeletedAtIsNull();
		LocalDateTime now = LocalDateTime.now(KST);
		
		for(UserTodo todo : todos){
			try{
				TodoDataDto data;
				if(todo.getTodoData() != null && !todo.getTodoData().isEmpty()){
					data = objectMapper.readValue(todo.getTodoData(), TodoDataDto.class);
				}else{
					data = TodoDataDto.createDefault();
				}
				
				TodoDataDto reset = TodoDataDto.createDailyReset(data);
				todo.setTodoData(objectMapper.writeValueAsString(reset));
				todo.setLastDailyReset(now);
				userTodoRepository.save(todo);
			}catch(JsonProcessingException e){
				// skip this todo on error
			}
		}
	}
	
	/**
	 * 전체 TODO의 주간 항목을 리셋합니다.
	 */
	@Transactional
	public void resetWeekly(){
		List<UserTodo> todos = userTodoRepository.findByDeletedAtIsNull();
		LocalDateTime now = LocalDateTime.now(KST);
		
		for(UserTodo todo : todos){
			try{
				TodoDataDto data;
				if(todo.getTodoData() != null && !todo.getTodoData().isEmpty()){
					data = objectMapper.readValue(todo.getTodoData(), TodoDataDto.class);
				}else{
					data = TodoDataDto.createDefault();
				}
				
				TodoDataDto reset = TodoDataDto.createWeeklyReset(data);
				todo.setTodoData(objectMapper.writeValueAsString(reset));
				todo.setLastDailyReset(now);
				todo.setLastWeeklyReset(now);
				userTodoRepository.save(todo);
			}catch(JsonProcessingException e){
				// skip this todo on error
			}
		}
	}
	
	/**
	 * 조회 시점에 필요한 일일/주간 리셋을 지연 적용합니다.
	 *
	 * @param todo 대상 TODO 엔티티
	 */
	private void checkAndApplyLazyReset(UserTodo todo){
		LocalDateTime now = LocalDateTime.now(KST);
		LocalDate today = now.toLocalDate();
		
		// 일일 리셋 기준 시각: 매일 06:00 KST
		LocalDateTime todayReset = today.atTime(6, 0);
		if(now.isBefore(todayReset)){
			todayReset = todayReset.minusDays(1);
		}
		
		boolean needsDailyReset = todo.getLastDailyReset() == null || todo.getLastDailyReset().isBefore(todayReset);
		
		// 주간 리셋 기준 시각: 매주 월요일 06:00 KST
		LocalDate monday = today.with(DayOfWeek.MONDAY);
		LocalDateTime weeklyReset = monday.atTime(6, 0);
		if(now.isBefore(weeklyReset)){
			weeklyReset = weeklyReset.minusWeeks(1);
		}
		
		boolean needsWeeklyReset = todo.getLastWeeklyReset() == null || todo.getLastWeeklyReset().isBefore(weeklyReset);
		
		if(needsWeeklyReset){
			try{
				TodoDataDto data;
				if(todo.getTodoData() != null && !todo.getTodoData().isEmpty()){
					data = objectMapper.readValue(todo.getTodoData(), TodoDataDto.class);
				}else{
					data = TodoDataDto.createDefault();
				}
				TodoDataDto reset = TodoDataDto.createWeeklyReset(data);
				todo.setTodoData(objectMapper.writeValueAsString(reset));
				todo.setLastDailyReset(now);
				todo.setLastWeeklyReset(now);
				userTodoRepository.save(todo);
			}catch(JsonProcessingException e){
				// ignore
			}
		}else if(needsDailyReset){
			try{
				TodoDataDto data;
				if(todo.getTodoData() != null && !todo.getTodoData().isEmpty()){
					data = objectMapper.readValue(todo.getTodoData(), TodoDataDto.class);
				}else{
					data = TodoDataDto.createDefault();
				}
				TodoDataDto reset = TodoDataDto.createDailyReset(data);
				todo.setTodoData(objectMapper.writeValueAsString(reset));
				todo.setLastDailyReset(now);
				userTodoRepository.save(todo);
			}catch(JsonProcessingException e){
				// ignore
			}
		}
	}
	
	/**
	 * 기존 데이터 마이그레이션:
	 * daily.silverCoin/demonTribute가 JSON에 남아 있으면 resources로 이동
	 *
	 * @param todo 대상 TODO 엔티티
	 */
	private void migrateOldData(UserTodo todo){
		if(todo.getTodoData() == null || todo.getTodoData().isEmpty()){
			return;
		}
		try{
			// JSON에서 daily.silverCoin 또는 daily.demonTribute 존재 여부 확인
			var node = objectMapper.readTree(todo.getTodoData());
			var dailyNode = node.get("daily");
			if(dailyNode == null){
				return;
			}
			boolean hasSilverCoin = dailyNode.has("silverCoin");
			boolean hasDemonTribute = dailyNode.has("demonTribute");
			if(!hasSilverCoin && !hasDemonTribute){
				return;
			}
			
			// 마이그레이션 필요
			TodoDataDto data = objectMapper.readValue(todo.getTodoData(), TodoDataDto.class);
			if(data.getResources() == null){
				data.setResources(TodoDataDto.Resources.builder()
					.silverCoin(TodoDataDto.CounterTask.builder().current(0).build())
					.demonTribute(TodoDataDto.CounterTask.builder().current(0).build())
					.build());
			}
			
			// 마이그레이션된 데이터를 저장 (daily.silverCoin/demonTribute는 Jackson에서 무시됨)
			todo.setTodoData(objectMapper.writeValueAsString(data));
			userTodoRepository.save(todo);
		}catch(JsonProcessingException e){
			// ignore migration errors
		}
	}
}


