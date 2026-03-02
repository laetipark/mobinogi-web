package com.example.mobinogi.service.game;

import com.example.mobinogi.dto.game.GameEventDto;
import com.example.mobinogi.repository.GameEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Game event read service.
 */
@Service
@RequiredArgsConstructor
public class GameEventService{

	/** Game event repository. */
	private final GameEventRepository gameEventRepository;

	/**
	 * Returns active events that have not ended.
	 *
	 * @return active event DTO list
	 */
	@Transactional(readOnly = true)
	public List<GameEventDto> getActiveEvents(){
		return gameEventRepository.findByDeletedAtIsNullAndEndDateAfterOrderByEndDateAsc(LocalDateTime.now())
			.stream()
			.map(GameEventDto::fromEntity)
			.collect(Collectors.toList());
	}
}
