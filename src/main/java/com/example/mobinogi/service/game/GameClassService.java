package com.example.mobinogi.service.game;

import com.example.mobinogi.dto.game.GameClassDto;
import com.example.mobinogi.repository.GameClassRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GameClassService{

	private final GameClassRepository gameClassRepository;

	@Transactional(readOnly = true)
	public List<GameClassDto> getAllClasses(){
		return gameClassRepository.findAll()
			.stream()
			.map(GameClassDto::fromEntity)
			.collect(Collectors.toList());
	}
}
