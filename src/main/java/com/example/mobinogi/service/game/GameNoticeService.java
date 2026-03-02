package com.example.mobinogi.service.game;

import com.example.mobinogi.dto.game.GameNoticeDto;
import com.example.mobinogi.entity.game.GameNotice;
import com.example.mobinogi.repository.GameNoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Game notice read service.
 */
@Service
@RequiredArgsConstructor
public class GameNoticeService{

	/** Category key for general notices. */
	private static final String CATEGORY_NOTICE = "notice";

	/** Category key for update notes. */
	private static final String CATEGORY_UPDATE_NOTE = "updatenote";

	/** Category key for erin notes. */
	private static final String CATEGORY_ERIN_NOTE = "erinnote";

	/** Notice types mapped to `notice` group. */
	private static final List<String> NOTICE_GROUP_TYPES = List.of(
		"notice",
		"maintenanceInProgress",
		"maintenanceCompleted"
	);

	/** Category-to-notice-type mapping. */
	private static final Map<String, List<String>> CATEGORY_TYPE_MAP = Map.of(
		CATEGORY_NOTICE, NOTICE_GROUP_TYPES,
		CATEGORY_UPDATE_NOTE, List.of("updateNote"),
		CATEGORY_ERIN_NOTE, List.of("erinNote")
	);

	/** Notice repository. */
	private final GameNoticeRepository gameNoticeRepository;

	/**
	 * Returns notices filtered by category.
	 *
	 * @param category optional category filter
	 * @return notice DTO list
	 */
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

	/**
	 * Normalizes raw category text.
	 *
	 * @param category raw category
	 * @return normalized category or null
	 */
	private String normalizeCategory(String category){
		if(category == null || category.isBlank()){
			return null;
		}
		return category.trim().toLowerCase(Locale.ROOT);
	}

	/**
	 * Resolves notice types by normalized category.
	 *
	 * @param normalizedCategory normalized category
	 * @return notice-type list
	 */
	private List<String> resolveNoticeTypes(String normalizedCategory){
		List<String> noticeTypes = CATEGORY_TYPE_MAP.get(normalizedCategory);
		if(noticeTypes == null){
			throw new IllegalArgumentException("Unsupported category: " + normalizedCategory);
		}
		return noticeTypes;
	}
}
