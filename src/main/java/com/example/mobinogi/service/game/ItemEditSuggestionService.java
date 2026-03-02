package com.example.mobinogi.service.game;

import com.example.mobinogi.dto.game.ItemEditSuggestionCreateRequest;
import com.example.mobinogi.dto.game.ItemEditSuggestionDto;
import com.example.mobinogi.entity.*;
import com.example.mobinogi.repository.*;
import com.example.mobinogi.service.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ItemEditSuggestionService{

	private final ItemEditSuggestionRepository itemEditSuggestionRepository;
	private final GameItemRepository gameItemRepository;
	private final LifeBarterRepository lifeBarterRepository;
	private final LifeCraftRepository lifeCraftRepository;
	private final UserService userService;
	private final GoogleSheetsItemEditSyncService googleSheetsItemEditSyncService;

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

	@Transactional
	public ItemEditSuggestionDto approveSuggestion(Long suggestionId, Long reviewerUserId, String reviewNote, String adminSuggestedValue){
		User reviewer = userService.findById(reviewerUserId);
		requireAdmin(reviewer);

		ItemEditSuggestion suggestion = itemEditSuggestionRepository.findById(suggestionId)
			.orElseThrow(() -> new IllegalArgumentException("Suggestion not found"));
		if(suggestion.getStatus() != ItemEditSuggestionStatus.PENDING){
			throw new IllegalStateException("Only pending suggestions can be approved");
		}

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

	private void validateTarget(String itemName, ItemEditSuggestionTargetType targetType, Long targetRecordId){
		gameItemRepository.findByItemName(itemName)
			.orElseThrow(() -> new IllegalArgumentException("Item not found: " + itemName));

		switch(targetType){
			case ITEM -> {
				// No extra target record needed.
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

	private void requireAdmin(User user){
		if(user == null || !Boolean.TRUE.equals(user.getIsAdmin())){
			throw new SecurityException("Admin permission required");
		}
	}

	private ItemEditSuggestionTargetType parseTargetType(String raw){
		String normalized = normalizeRequired(raw, "targetType").toUpperCase(Locale.ROOT);
		try{
			return ItemEditSuggestionTargetType.valueOf(normalized);
		}catch(IllegalArgumentException e){
			throw new IllegalArgumentException("Invalid targetType: " + raw);
		}
	}

	private ItemEditSuggestionStatus parseStatus(String raw){
		String normalized = normalizeRequired(raw, "status").toUpperCase(Locale.ROOT);
		try{
			return ItemEditSuggestionStatus.valueOf(normalized);
		}catch(IllegalArgumentException e){
			throw new IllegalArgumentException("Invalid status: " + raw);
		}
	}

	private String resolveUserDisplayName(User user){
		if(user == null){
			return null;
		}
		if(hasText(user.getNickname())){
			return user.getNickname().trim();
		}
		if(hasText(user.getDiscordUsername())){
			return user.getDiscordUsername().trim();
		}
		return "user#" + user.getUserId();
	}

	private String normalizeRequired(String value, String fieldName){
		String normalized = trimToNull(value);
		if(normalized == null){
			throw new IllegalArgumentException(fieldName + " is required");
		}
		return normalized;
	}

	private String trimToNull(String value){
		if(value == null){
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private boolean hasText(String value){
		return value != null && !value.trim().isEmpty();
	}
}
