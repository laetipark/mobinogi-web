package com.example.mobinogi.service.user;

import com.example.mobinogi.dto.user.TodoDataDto;
import com.example.mobinogi.dto.user.UserTodoDto;
import com.example.mobinogi.dto.user.UserTodoUpdateRequest;
import com.example.mobinogi.entity.UserCharacter;
import com.example.mobinogi.entity.UserTodo;
import com.example.mobinogi.repository.UserCharacterRepository;
import com.example.mobinogi.repository.UserTodoRepository;
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
	
	private final UserTodoRepository userTodoRepository;
	private final UserCharacterRepository userCharacterRepository;
	private final ObjectMapper objectMapper;
	
	private static final ZoneId KST = ZoneId.of("Asia/Seoul");
	
	@Transactional(readOnly = true)
	public List<UserTodoDto> getTodosByUserId(Long userId){
		List<UserTodo> todos = userTodoRepository.findByUserIdAndDeletedAtIsNull(userId);
		
		// 등록된 캐릭터 중 todo가 없는 캐릭터도 포함
		List<UserCharacter> characters = userCharacterRepository.findByUser_UserIdAndDeletedAtIsNullOrderByCharacterOrderAsc(userId);
		
		List<UserTodoDto> result = new ArrayList<>();
		for(UserCharacter character : characters){
			UserTodo todo = todos.stream()
				.filter(t -> t.getCharacterId().equals(character.getCharacterId()))
				.findFirst()
				.orElse(null);
			
			if(todo != null){
				checkAndApplyLazyReset(todo);
				migrateOldData(todo);
				result.add(UserTodoDto.fromEntity(todo));
			}else{
				// 캐릭터에 대한 todo가 없으면 기본값으로 DTO 생성
				UserTodoDto dto = UserTodoDto.builder()
					.userId(userId)
					.characterId(character.getCharacterId())
					.characterName(character.getCharacterName())
					.serverName(character.getCharacterServer())
					.className(character.getCharacterClass())
					.todoData(TodoDataDto.createDefault())
					.build();
				result.add(dto);
			}
		}
		
		return result;
	}
	
	@Transactional
	public UserTodoDto updateTodo(Long userId, Long characterId, UserTodoUpdateRequest request){
		UserTodo todo = userTodoRepository.findByUserIdAndCharacterIdAndDeletedAtIsNull(userId, characterId)
			.orElse(null);
		
		if(todo == null){
			// 캐릭터 존재 확인
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
			throw new RuntimeException("숙제 데이터 변환에 실패했습니다.");
		}
		
		todo = userTodoRepository.save(todo);
		return UserTodoDto.fromEntity(todo);
	}
	
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
	
	private void checkAndApplyLazyReset(UserTodo todo){
		LocalDateTime now = LocalDateTime.now(KST);
		LocalDate today = now.toLocalDate();
		
		// 오늘 06:00 KST
		LocalDateTime todayReset = today.atTime(6, 0);
		if(now.isBefore(todayReset)){
			todayReset = todayReset.minusDays(1);
		}
		
		boolean needsDailyReset = todo.getLastDailyReset() == null || todo.getLastDailyReset().isBefore(todayReset);
		
		// 이번 주 월요일 06:00 KST
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
	 * 기존 데이터 마이그레이션: daily에 silverCoin/demonTribute가 JSON에 남아있으면 resources로 이동
	 */
	private void migrateOldData(UserTodo todo){
		if(todo.getTodoData() == null || todo.getTodoData().isEmpty()){
			return;
		}
		try{
			// JSON에서 daily.silverCoin 또는 daily.demonTribute가 있는지 확인
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
			
			// 마이그레이션된 데이터 저장 (daily에서 silverCoin/demonTribute는 Jackson이 무시함)
			todo.setTodoData(objectMapper.writeValueAsString(data));
			userTodoRepository.save(todo);
		}catch(JsonProcessingException e){
			// ignore migration errors
		}
	}
}
