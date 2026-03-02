package com.example.mobinogi.service.game;

import com.example.mobinogi.dto.game.GameMonsterDto;
import com.example.mobinogi.repository.GameMonsterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Game monster read service.
 */
@Service
@RequiredArgsConstructor
public class GameMonsterService{

	/** Monster repository. */
	private final GameMonsterRepository gameMonsterRepository;

	/**
	 * Returns monsters filtered by type.
	 *
	 * @param monsterType monster type
	 * @return monster DTO list
	 */
	@Transactional(readOnly = true)
	public List<GameMonsterDto> getMonstersByType(String monsterType){
		return gameMonsterRepository.findByMonsterType(monsterType)
			.stream()
			.map(GameMonsterDto::fromEntity)
			.collect(Collectors.toList());
	}

	/**
	 * Returns all monsters.
	 *
	 * @return monster DTO list
	 */
	@Transactional(readOnly = true)
	public List<GameMonsterDto> getAllMonsters(){
		return gameMonsterRepository.findAll()
			.stream()
			.map(GameMonsterDto::fromEntity)
			.collect(Collectors.toList());
	}
}
