package com.example.mobinogi.service.game;

import com.example.mobinogi.dto.game.GameNoticeDto;
import com.example.mobinogi.entity.GameNotice;
import com.example.mobinogi.repository.GameNoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GameNoticeService{

	private static final String CATEGORY_NOTICE = "notice";
	private static final String CATEGORY_UPDATE_NOTE = "updatenote";
	private static final String CATEGORY_ERIN_NOTE = "erinnote";

	private static final List<String> NOTICE_GROUP_TYPES = List.of(
		"notice",
		"maintenanceInProgress",
		"maintenanceCompleted"
	);

	private static final Map<String, List<String>> CATEGORY_TYPE_MAP = Map.of(
		CATEGORY_NOTICE, NOTICE_GROUP_TYPES,
		CATEGORY_UPDATE_NOTE, List.of("updateNote"),
		CATEGORY_ERIN_NOTE, List.of("erinNote")
	);

	private final GameNoticeRepository gameNoticeRepository;

	@Transactional(readOnly = true)
	public List<GameNoticeDto> getNotices(String category){
		String normalizedCategory = normalizeCategory(category);

		List<GameNotice> notices = normalizedCategory == null
			? gameNoticeRepository.findActiveNotices()
			: gameNoticeRepository.findActiveNoticesByTypes(resolveNoticeTypes(normalizedCategory));

		return notices.stream()
			.map(GameNoticeDto::fromEntity)
			.toList();
	}

	private String normalizeCategory(String category){
		if(category == null || category.isBlank()){
			return null;
		}
		return category.trim().toLowerCase(Locale.ROOT);
	}

	private List<String> resolveNoticeTypes(String normalizedCategory){
		List<String> noticeTypes = CATEGORY_TYPE_MAP.get(normalizedCategory);
		if(noticeTypes == null){
			throw new IllegalArgumentException("Unsupported category: " + normalizedCategory);
		}
		return noticeTypes;
	}
}
