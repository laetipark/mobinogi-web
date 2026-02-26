package com.example.mobinogi.service.game;

import com.example.mobinogi.entity.*;
import com.example.mobinogi.repository.GameItemRepository;
import com.example.mobinogi.repository.LifeBarterRepository;
import com.example.mobinogi.repository.LifeCraftRepository;
import com.google.auth.oauth2.GoogleCredentials;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleSheetsItemEditSyncService{

	private static final String SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
	private static final Map<String, String> ITEM_FIELD_TO_COLUMN = Map.of(
		"itemMainMenu", "A",
		"itemSubMenu", "B",
		"itemType", "C",
		"itemRarity", "D",
		"itemName", "E",
		"itemEffect", "F",
		"itemTranscendence", "G",
		"itemSource", "H"
	);
	private static final Map<String, String> BARTER_FIELD_TO_COLUMN = Map.ofEntries(
		Map.entry("regionId", "A"),
		Map.entry("npcId", "C"),
		Map.entry("itemId", "E"),
		Map.entry("itemWeight", "G"),
		Map.entry("exchangeId", "H"),
		Map.entry("exchangeCost", "J"),
		Map.entry("barterQty", "K"),
		Map.entry("barterInitCycle", "L"),
		Map.entry("barterInitDate", "M"),
		Map.entry("barterInitDay", "N"),
		Map.entry("barterServer", "O"),
		Map.entry("barterNpc", "P")
	);
	private static final Map<String, String> CRAFT_FIELD_TO_COLUMN = Map.of(
		"itemId", "A",
		"craftType", "B",
		"craftName", "C",
		"itemName", "D",
		"craftIngredientId", "E",
		"ingredientName", "F",
		"craftIngredientCost", "G",
		"craftableLevel", "H",
		"processingTime", "I",
		"craftSubId", "J"
	);

	private final GameItemRepository gameItemRepository;
	private final LifeBarterRepository lifeBarterRepository;
	private final LifeCraftRepository lifeCraftRepository;
	private final RestTemplate restTemplate = new RestTemplate();

	@Value("${GOOGLE_CREDENTIALS_PATH:}")
	private String googleCredentialsPath;

	@Value("${GOOGLE_SHEETS_ID:}")
	private String googleSheetsId;

	@Value("${GOOGLE_SHEETS_CHANGE_LOG_SHEET:item_change_log}")
	private String changeLogSheetName;

	public boolean isSupportedField(ItemEditSuggestionTargetType targetType, String fieldKey){
		if(targetType == null || fieldKey == null){
			return false;
		}
		return switch(targetType){
			case ITEM -> ITEM_FIELD_TO_COLUMN.containsKey(fieldKey);
			case BARTER -> BARTER_FIELD_TO_COLUMN.containsKey(fieldKey);
			case CRAFT -> CRAFT_FIELD_TO_COLUMN.containsKey(fieldKey);
		};
	}

	public SheetApplyResult applyApprovedSuggestion(ItemEditSuggestion suggestion){
		if(!isConfigured()){
			String message = "Google Sheets sync disabled: GOOGLE_CREDENTIALS_PATH or GOOGLE_SHEETS_ID missing";
			appendChangeLogQuietly(suggestion, "APPROVED", "FAILED", null, message);
			return new SheetApplyResult(SheetSyncStatus.FAILED, message, null, null);
		}

		String targetRange = null;
		try{
			targetRange = resolveTargetRange(suggestion);
			updateSingleCell(targetRange, suggestion.getSuggestedValue());
			String syncMessage = "Applied to Google Sheets";
			appendChangeLogQuietly(suggestion, "APPROVED", "SYNCED", targetRange, syncMessage);
			return new SheetApplyResult(SheetSyncStatus.SYNCED, syncMessage, targetRange, LocalDateTime.now());
		}catch(Exception e){
			String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
			log.warn("Failed to sync item edit suggestion {} to Google Sheets: {}", suggestion.getSuggestionId(), message);
			appendChangeLogQuietly(suggestion, "APPROVED", "FAILED", targetRange, message);
			return new SheetApplyResult(SheetSyncStatus.FAILED, message, targetRange, null);
		}
	}

	public void logRejectedSuggestion(ItemEditSuggestion suggestion){
		appendChangeLogQuietly(suggestion, "REJECTED", "SKIPPED", null, "Rejected by admin");
	}

	private boolean isConfigured(){
		return hasText(googleCredentialsPath) && hasText(googleSheetsId);
	}

	private String resolveTargetRange(ItemEditSuggestion suggestion){
		String fieldKey = suggestion.getFieldKey();
		return switch(suggestion.getTargetType()){
			case ITEM -> {
				GameItem item = gameItemRepository.findByItemName(suggestion.getItemName())
					.orElseThrow(() -> new IllegalArgumentException("Target item not found for sheet sync"));
				String column = ITEM_FIELD_TO_COLUMN.get(fieldKey);
				if(column == null){
					throw new IllegalArgumentException("Unsupported item field: " + fieldKey);
				}
				long rowIndex = item.getItemId() + 1L; // sheet data starts at row 2
				yield "item!" + column + rowIndex;
			}
			case BARTER -> {
				Long targetRecordId = suggestion.getTargetRecordId();
				if(targetRecordId == null){
					throw new IllegalArgumentException("targetRecordId is required for barter suggestions");
				}
				if(lifeBarterRepository.findById(targetRecordId).isEmpty()){
					throw new IllegalArgumentException("Barter row not found: " + targetRecordId);
				}
				String column = BARTER_FIELD_TO_COLUMN.get(fieldKey);
				if(column == null){
					throw new IllegalArgumentException("Unsupported barter field: " + fieldKey);
				}
				long rowIndex = targetRecordId + 1L;
				yield "barter!" + column + rowIndex;
			}
			case CRAFT -> {
				Long targetRecordId = suggestion.getTargetRecordId();
				if(targetRecordId == null){
					throw new IllegalArgumentException("targetRecordId is required for craft suggestions");
				}
				if(lifeCraftRepository.findById(targetRecordId).isEmpty()){
					throw new IllegalArgumentException("Craft row not found: " + targetRecordId);
				}
				String column = CRAFT_FIELD_TO_COLUMN.get(fieldKey);
				if(column == null){
					throw new IllegalArgumentException("Unsupported craft field: " + fieldKey);
				}
				long rowIndex = targetRecordId + 1L;
				yield "craft!" + column + rowIndex;
			}
		};
	}

	private void updateSingleCell(String range, String value) throws IOException{
		String accessToken = getAccessToken();
		String encodedRange = UriUtils.encodePathSegment(range, StandardCharsets.UTF_8);
		String url = "https://sheets.googleapis.com/v4/spreadsheets/" + googleSheetsId
			+ "/values/" + encodedRange + "?valueInputOption=USER_ENTERED";

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("range", range);
		payload.put("majorDimension", "ROWS");
		payload.put("values", List.of(List.of(value == null ? "" : value)));

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);
		headers.setBearerAuth(accessToken);

		ResponseEntity<String> response = restTemplate.exchange(
			url,
			HttpMethod.PUT,
			new HttpEntity<>(payload, headers),
			String.class
		);

		if(!response.getStatusCode().is2xxSuccessful()){
			throw new IllegalStateException("Google Sheets update failed: HTTP " + response.getStatusCode().value());
		}
	}

	private void appendChangeLogQuietly(ItemEditSuggestion suggestion, String action, String syncResult, String range, String message){
		if(!isConfigured()){
			return;
		}

		try{
			appendChangeLog(suggestion, action, syncResult, range, message);
		}catch(Exception e){
			log.warn("Failed to append item edit change log for suggestion {}: {}", suggestion.getSuggestionId(), e.getMessage());
		}
	}

	private void appendChangeLog(ItemEditSuggestion suggestion, String action, String syncResult, String range, String message) throws IOException{
		String accessToken = getAccessToken();
		String appendRange = (hasText(changeLogSheetName) ? changeLogSheetName.trim() : "item_change_log") + "!A:K";
		String encodedRange = UriUtils.encodePathSegment(appendRange, StandardCharsets.UTF_8);
		String url = "https://sheets.googleapis.com/v4/spreadsheets/" + googleSheetsId
			+ "/values/" + encodedRange
			+ ":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS";

		List<Object> row = List.of(
			LocalDateTime.now().toString(),
			action,
			suggestion.getItemName(),
			String.valueOf(suggestion.getTargetType()),
			suggestion.getTargetRecordId() == null ? "" : suggestion.getTargetRecordId(),
			nullSafe(suggestion.getFieldKey()),
			nullSafe(suggestion.getCurrentValue()),
			nullSafe(suggestion.getSuggestedValue()),
			nullSafe(suggestion.getReviewerNickname()),
			syncResult,
			range == null ? nullSafe(message) : range + (hasText(message) ? " | " + message : "")
		);

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("majorDimension", "ROWS");
		payload.put("values", List.of(row));

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);
		headers.setBearerAuth(accessToken);

		ResponseEntity<String> response = restTemplate.exchange(
			url,
			HttpMethod.POST,
			new HttpEntity<>(payload, headers),
			String.class
		);

		if(!response.getStatusCode().is2xxSuccessful()){
			throw new IllegalStateException("Google Sheets append log failed: HTTP " + response.getStatusCode().value());
		}
	}

	private String getAccessToken() throws IOException{
		Path credentialsFile = resolveCredentialsFile();
		if(credentialsFile == null || !Files.exists(credentialsFile)){
			throw new IllegalStateException("Google credentials file not found: " + googleCredentialsPath);
		}

		try(InputStream inputStream = Files.newInputStream(credentialsFile)){
			GoogleCredentials credentials = GoogleCredentials.fromStream(inputStream)
				.createScoped(List.of(SHEETS_SCOPE));
			credentials.refreshIfExpired();
			if(credentials.getAccessToken() == null){
				credentials.refresh();
			}
			if(credentials.getAccessToken() == null){
				throw new IllegalStateException("Failed to obtain Google access token");
			}
			return credentials.getAccessToken().getTokenValue();
		}
	}

	private Path resolveCredentialsFile(){
		if(!hasText(googleCredentialsPath)){
			return null;
		}

		String configured = googleCredentialsPath.trim();
		List<Path> candidates = new ArrayList<>();
		Path direct = Paths.get(configured);
		candidates.add(direct);

		if(!direct.isAbsolute()){
			String normalized = configured.startsWith("./") ? configured.substring(2) : configured;
			candidates.add(Paths.get("mobinogi-web", normalized));
			candidates.add(Paths.get("..", "mobinogi-web", normalized));
			candidates.add(Paths.get("mobinogi-crawler", normalized));
			candidates.add(Paths.get("..", "mobinogi-crawler", normalized));
			candidates.add(Paths.get("..", normalized));
		}

		for(Path candidate : candidates){
			Path absolutePath = candidate.toAbsolutePath().normalize();
			if(Files.exists(absolutePath)){
				return absolutePath;
			}
		}

		return direct.toAbsolutePath().normalize();
	}

	private boolean hasText(String value){
		return value != null && !value.trim().isEmpty();
	}

	private String nullSafe(String value){
		return value == null ? "" : value;
	}

	public record SheetApplyResult(
		SheetSyncStatus status,
		String message,
		String appliedRange,
		LocalDateTime appliedAt
	){}
}
