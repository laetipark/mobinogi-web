package com.example.mobinogi.service.game;

import com.example.mobinogi.dto.game.ItemEditSuggestionCreateRequest;
import com.example.mobinogi.dto.game.ItemEditSuggestionDto;
import com.example.mobinogi.entity.game.ItemEditSuggestion;
import com.example.mobinogi.entity.game.ItemEditSuggestionStatus;
import com.example.mobinogi.entity.game.ItemEditSuggestionTargetType;
import com.example.mobinogi.entity.game.SheetSyncStatus;
import com.example.mobinogi.entity.life.LifeBarter;
import com.example.mobinogi.entity.life.LifeCraft;
import com.example.mobinogi.entity.user.User;
import com.example.mobinogi.repository.GameItemRepository;
import com.example.mobinogi.repository.ItemEditSuggestionRepository;
import com.example.mobinogi.repository.LifeBarterRepository;
import com.example.mobinogi.repository.LifeCraftRepository;
import com.example.mobinogi.service.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Item edit suggestion service for player-submitted corrections.
 */
@Service
@RequiredArgsConstructor
public class ItemEditSuggestionService{

	/** Suggestion persistence repository. */
	private final ItemEditSuggestionRepository itemEditSuggestionRepository;

	/** Item repository for target validation. */
	private final GameItemRepository gameItemRepository;

	/** Barter repository for barter target validation. */
	private final LifeBarterRepository lifeBarterRepository;

	/** Craft repository for craft target validation. */
	private final LifeCraftRepository lifeCraftRepository;

	/** User service for requester and reviewer resolution. */
	private final UserService userService;

	/** Google Sheets integration service. */
	private final GoogleSheetsItemEditSyncService googleSheetsItemEditSyncService;

	/**
	 * Creates a new suggestion.
	 * Admin submitters are auto-approved and synced immediately.
	 *
	 * @param requesterUserId authenticated requester user ID
	 * @param request suggestion payload
	 * @return created suggestion DTO
	 */
	@Transactional
	public ItemEditSuggestionDto createSuggestion(Long requesterUserId, ItemEditSuggestionCreateRequest request){
		if(requesterUserId == null){
			throw new IllegalArgumentException("Authentication is required");
		}
		if(request == null){
			throw new IllegalArgumentException("Request body is required");
		}

		User requester = userService.findById(requesterUserId);
		boolean requesterIsAdmin = Boolean.TRUE.equals(requester.getIsAdmin());
		String requesterDisplayName = resolveUserDisplayName(requester);
		String itemName = normalizeRequired(request.getItemName(), "itemName");
		String fieldKey = normalizeRequired(request.getFieldKey(), "fieldKey");
		String suggestedValue = normalizeRequired(request.getSuggestedValue(), "suggestedValue");
		ItemEditSuggestionTargetType targetType = parseTargetType(request.getTargetType());

		// Validate target row ownership and supported field restrictions.
		validateTarget(itemName, targetType, request.getTargetRecordId());
		if(!googleSheetsItemEditSyncService.isSupportedField(targetType, fieldKey)){
			throw new IllegalArgumentException("Unsupported field for target type: " + fieldKey);
		}

		ItemEditSuggestion entity = ItemEditSuggestion.builder()
			.itemName(itemName)
			.targetType(targetType)
			.targetRecordId(request.getTargetRecordId())
			.fieldKey(fieldKey)
			.currentValue(trimToNull(request.getCurrentValue()))
			.suggestedValue(suggestedValue)
			.reason(trimToNull(request.getReason()))
			.status(requesterIsAdmin ? ItemEditSuggestionStatus.APPROVED : ItemEditSuggestionStatus.PENDING)
			.sheetSyncStatus(SheetSyncStatus.NOT_STARTED)
			.requesterUserId(requester.getUserId())
			.requesterNickname(requesterDisplayName)
			.reviewerUserId(requesterIsAdmin ? requester.getUserId() : null)
			.reviewerNickname(requesterIsAdmin ? requesterDisplayName : null)
			.reviewNote(requesterIsAdmin ? "Auto-approved: submitted by admin" : null)
			.approvedAt(requesterIsAdmin ? LocalDateTime.now() : null)
			.build();

		ItemEditSuggestion saved = itemEditSuggestionRepository.save(entity);

		// Admin submit is immediately applied to the external sheet.
		if(requesterIsAdmin){
			GoogleSheetsItemEditSyncService.SheetApplyResult syncResult = googleSheetsItemEditSyncService.applyApprovedSuggestion(saved);
			saved.setSheetSyncStatus(syncResult.status());
			saved.setSheetSyncMessage(syncResult.message());
			saved.setSheetSyncRange(syncResult.appliedRange());
			saved.setSheetSyncedAt(syncResult.appliedAt());
			saved = itemEditSuggestionRepository.save(saved);
		}

		return ItemEditSuggestionDto.fromEntity(saved);
	}

	/**
	 * Returns suggestions for one item.
	 * Only administrators can access this view.
	 *
	 * @param itemName item name
	 * @param status optional status filter
	 * @param requesterUserId requester user ID
	 * @return suggestion list
	 */
	@Transactional(readOnly = true)
	public List<ItemEditSuggestionDto> getItemSuggestions(String itemName, String status, Long requesterUserId){
		User requester = userService.findById(requesterUserId);
		requireAdmin(requester);

		String normalizedItemName = normalizeRequired(itemName, "itemName");
		List<ItemEditSuggestion> entities;
		if(status == null || status.trim().isEmpty()){
			entities = itemEditSuggestionRepository.findByItemNameOrderByCreatedAtDesc(normalizedItemName);
		}else{
			ItemEditSuggestionStatus parsedStatus = parseStatus(status);
			entities = itemEditSuggestionRepository.findByItemNameAndStatusOrderByCreatedAtDesc(normalizedItemName, parsedStatus);
		}

		return entities.stream().map(ItemEditSuggestionDto::fromEntity).toList();
	}

	/**
	 * Returns pending suggestions.
	 * Only administrators can access this view.
	 *
	 * @param requesterUserId requester user ID
	 * @return pending suggestion list
	 */
	@Transactional(readOnly = true)
	public List<ItemEditSuggestionDto> getPendingSuggestions(Long requesterUserId){
		User requester = userService.findById(requesterUserId);
		requireAdmin(requester);

		return itemEditSuggestionRepository
			.findByStatusOrderByCreatedAtDesc(ItemEditSuggestionStatus.PENDING)
			.stream()
			.map(ItemEditSuggestionDto::fromEntity)
			.toList();
	}

	/**
	 * Approves a pending suggestion and applies it to Google Sheets.
	 *
	 * @param suggestionId suggestion ID
	 * @param reviewerUserId admin reviewer user ID
	 * @param reviewNote optional review note
	 * @param adminSuggestedValue optional override value
	 * @return approved suggestion DTO
	 */
	@Transactional
	public ItemEditSuggestionDto approveSuggestion(
		Long suggestionId,
		Long reviewerUserId,
		String reviewNote,
		String adminSuggestedValue
	){
		User reviewer = userService.findById(reviewerUserId);
		requireAdmin(reviewer);

		ItemEditSuggestion suggestion = itemEditSuggestionRepository.findById(suggestionId)
			.orElseThrow(() -> new IllegalArgumentException("Suggestion not found"));
		if(suggestion.getStatus() != ItemEditSuggestionStatus.PENDING){
			throw new IllegalStateException("Only pending suggestions can be approved");
		}

		// Persist review metadata before sheet synchronization.
		suggestion.setStatus(ItemEditSuggestionStatus.APPROVED);
		suggestion.setApprovedAt(LocalDateTime.now());
		suggestion.setReviewerUserId(reviewer.getUserId());
		suggestion.setReviewerNickname(resolveUserDisplayName(reviewer));
		suggestion.setReviewNote(trimToNull(reviewNote));
		if(adminSuggestedValue != null){
			suggestion.setSuggestedValue(normalizeRequired(adminSuggestedValue, "suggestedValue"));
		}

		GoogleSheetsItemEditSyncService.SheetApplyResult syncResult = googleSheetsItemEditSyncService.applyApprovedSuggestion(suggestion);
		suggestion.setSheetSyncStatus(syncResult.status());
		suggestion.setSheetSyncMessage(syncResult.message());
		suggestion.setSheetSyncRange(syncResult.appliedRange());
		suggestion.setSheetSyncedAt(syncResult.appliedAt());

		return ItemEditSuggestionDto.fromEntity(itemEditSuggestionRepository.save(suggestion));
	}

	/**
	 * Rejects a pending suggestion.
	 *
	 * @param suggestionId suggestion ID
	 * @param reviewerUserId admin reviewer user ID
	 * @param reviewNote review note
	 * @return rejected suggestion DTO
	 */
	@Transactional
	public ItemEditSuggestionDto rejectSuggestion(Long suggestionId, Long reviewerUserId, String reviewNote){
		User reviewer = userService.findById(reviewerUserId);
		requireAdmin(reviewer);

		ItemEditSuggestion suggestion = itemEditSuggestionRepository.findById(suggestionId)
			.orElseThrow(() -> new IllegalArgumentException("Suggestion not found"));
		if(suggestion.getStatus() != ItemEditSuggestionStatus.PENDING){
			throw new IllegalStateException("Only pending suggestions can be rejected");
		}

		suggestion.setStatus(ItemEditSuggestionStatus.REJECTED);
		suggestion.setRejectedAt(LocalDateTime.now());
		suggestion.setReviewerUserId(reviewer.getUserId());
		suggestion.setReviewerNickname(resolveUserDisplayName(reviewer));
		suggestion.setReviewNote(trimToNull(reviewNote));
		suggestion.setSheetSyncStatus(SheetSyncStatus.SKIPPED);
		suggestion.setSheetSyncMessage("Rejected by admin");
		suggestion.setSheetSyncRange(null);
		suggestion.setSheetSyncedAt(null);

		googleSheetsItemEditSyncService.logRejectedSuggestion(suggestion);
		return ItemEditSuggestionDto.fromEntity(itemEditSuggestionRepository.save(suggestion));
	}

	/**
	 * Validates whether target metadata belongs to the selected item.
	 *
	 * @param itemName item name
	 * @param targetType target type
	 * @param targetRecordId optional target row ID
	 */
	private void validateTarget(String itemName, ItemEditSuggestionTargetType targetType, Long targetRecordId){
		gameItemRepository.findByItemName(itemName)
			.orElseThrow(() -> new IllegalArgumentException("Item not found: " + itemName));

		switch(targetType){
			case ITEM -> {
				// No target record linkage check is needed for item-level edits.
			}
			case BARTER -> {
				if(targetRecordId == null){
					throw new IllegalArgumentException("targetRecordId is required for barter suggestions");
				}
				LifeBarter barter = lifeBarterRepository.findById(targetRecordId)
					.orElseThrow(() -> new IllegalArgumentException("Barter row not found: " + targetRecordId));
				boolean related = Objects.equals(barter.getGameItem() != null ? barter.getGameItem().getItemName() : null, itemName)
					|| Objects.equals(barter.getExchangeItem() != null ? barter.getExchangeItem().getItemName() : null, itemName);
				if(!related){
					throw new IllegalArgumentException("Barter row is not related to item: " + itemName);
				}
			}
			case CRAFT -> {
				if(targetRecordId == null){
					throw new IllegalArgumentException("targetRecordId is required for craft suggestions");
				}
				LifeCraft craft = lifeCraftRepository.findById(targetRecordId)
					.orElseThrow(() -> new IllegalArgumentException("Craft row not found: " + targetRecordId));
				boolean related = Objects.equals(craft.getItemName(), itemName)
					|| Objects.equals(craft.getGameItem() != null ? craft.getGameItem().getItemName() : null, itemName);
				if(!related){
					throw new IllegalArgumentException("Craft row is not related to item: " + itemName);
				}
			}
		}
	}

	/**
	 * Ensures requester has admin privileges.
	 *
	 * @param user requester entity
	 */
	private void requireAdmin(User user){
		if(user == null || !Boolean.TRUE.equals(user.getIsAdmin())){
			throw new SecurityException("Admin permission required");
		}
	}

	/**
	 * Parses raw target type.
	 *
	 * @param raw target type text
	 * @return parsed enum
	 */
	private ItemEditSuggestionTargetType parseTargetType(String raw){
		String normalized = normalizeRequired(raw, "targetType").toUpperCase(Locale.ROOT);
		try{
			return ItemEditSuggestionTargetType.valueOf(normalized);
		}catch(IllegalArgumentException e){
			throw new IllegalArgumentException("Invalid targetType: " + raw);
		}
	}

	/**
	 * Parses raw suggestion status.
	 *
	 * @param raw status text
	 * @return parsed enum
	 */
	private ItemEditSuggestionStatus parseStatus(String raw){
		String normalized = normalizeRequired(raw, "status").toUpperCase(Locale.ROOT);
		try{
			return ItemEditSuggestionStatus.valueOf(normalized);
		}catch(IllegalArgumentException e){
			throw new IllegalArgumentException("Invalid status: " + raw);
		}
	}

	/**
	 * Resolves display name for audit fields.
	 *
	 * @param user user entity
	 * @return display name
	 */
	private String resolveUserDisplayName(User user){
		if(user == null){
			return null;
		}
		if(hasText(user.getNickname())){
			return user.getNickname().trim();
		}
		return "user#" + user.getUserId();
	}

	/**
	 * Trims a required string and validates non-empty text.
	 *
	 * @param value raw value
	 * @param fieldName field name for error message
	 * @return normalized value
	 */
	private String normalizeRequired(String value, String fieldName){
		String normalized = trimToNull(value);
		if(normalized == null){
			throw new IllegalArgumentException(fieldName + " is required");
		}
		return normalized;
	}

	/**
	 * Trims a string and returns {@code null} when empty.
	 *
	 * @param value raw value
	 * @return trimmed or null
	 */
	private String trimToNull(String value){
		if(value == null){
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	/**
	 * Returns whether text contains non-whitespace characters.
	 *
	 * @param value text value
	 * @return true when non-empty text
	 */
	private boolean hasText(String value){
		return value != null && !value.trim().isEmpty();
	}
}
