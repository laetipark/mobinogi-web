package com.example.mobinogi.service.game;

import com.example.mobinogi.entity.game.GameItem;
import com.example.mobinogi.entity.game.ItemEditSuggestion;
import com.example.mobinogi.entity.game.ItemEditSuggestionTargetType;
import com.example.mobinogi.entity.game.SheetSyncStatus;
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

	/** OAuth scope for Google Sheets access. */
	private static final String SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

	/** Column mapping for item sheet fields. */
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

	/** Column mapping for barter sheet fields. */
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

	/** Column mapping for craft sheet fields. */
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

	/** Item repository. */
	private final GameItemRepository gameItemRepository;

	/** Barter repository. */
	private final LifeBarterRepository lifeBarterRepository;

	/** Craft repository. */
	private final LifeCraftRepository lifeCraftRepository;

	/** HTTP client for Google Sheets API calls. */
	private final RestTemplate restTemplate = new RestTemplate();

	/** Credential file path setting. */
	@Value("${GOOGLE_CREDENTIALS_PATH:}")
	/**
	 * Field googleCredentialsPath.
	 */
	private String googleCredentialsPath;

	/** Target spreadsheet ID. */
	@Value("${GOOGLE_SHEETS_ID:}")
	/**
	 * Field googleSheetsId.
	 */
	private String googleSheetsId;

	/** Change log worksheet name. */
	@Value("${GOOGLE_SHEETS_CHANGE_LOG_SHEET:item_change_log}")
	/**
	 * Field changeLogSheetName.
	 */
	private String changeLogSheetName;

	/**
	 * Returns whether a field is supported for target type.
	 *
	 * @param targetType suggestion target type
	 * @param fieldKey field key
	 * @return true when field is syncable
	 */
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

	/**
	 * Applies an approved suggestion to Google Sheets.
	 *
	 * @param suggestion approved suggestion
	 * @return sync result payload
	 */
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

	/**
	 * Writes a rejection log row without updating sheet values.
	 *
	 * @param suggestion rejected suggestion
	 */
	public void logRejectedSuggestion(ItemEditSuggestion suggestion){
		appendChangeLogQuietly(suggestion, "REJECTED", "SKIPPED", null, "Rejected by admin");
	}

	/**
	 * Returns whether Google Sheets integration is configured.
	 *
	 * @return true when credentials and sheet ID are provided
	 */
	private boolean isConfigured(){
		return hasText(googleCredentialsPath) && hasText(googleSheetsId);
	}

	/**
	 * Resolves A1 notation cell range for suggestion target.
	 *
	 * @param suggestion approved suggestion
	 * @return target cell range
	 */
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

	/**
	 * Updates one cell in Google Sheets.
	 *
	 * @param range A1 notation range
	 * @param value cell value
	 * @throws IOException when token acquisition fails
	 */
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

	/**
	 * Appends change log row and ignores failures.
	 *
	 * @param suggestion suggestion
	 * @param action action label
	 * @param syncResult sync result label
	 * @param range applied range
	 * @param message log message
	 */
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

	/**
	 * Appends one structured change log row.
	 *
	 * @param suggestion suggestion
	 * @param action action label
	 * @param syncResult sync result label
	 * @param range applied range
	 * @param message log message
	 * @throws IOException when token acquisition fails
	 */
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

	/**
	 * Acquires OAuth access token from service account credentials.
	 *
	 * @return bearer token
	 * @throws IOException when credentials cannot be read
	 */
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

	/**
	 * Resolves credentials path candidates.
	 *
	 * @return resolved path
	 */
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

	/**
	 * Returns whether text has non-whitespace characters.
	 *
	 * @param value text value
	 * @return true when non-empty
	 */
	private boolean hasText(String value){
		return value != null && !value.trim().isEmpty();
	}

	/**
	 * Converts nullable text to non-null value.
	 *
	 * @param value text value
	 * @return empty string when null
	 */
	private String nullSafe(String value){
		return value == null ? "" : value;
	}

	/**
	 * Google Sheets write result.
	 *
	 * @param status sync status
	 * @param message result message
	 * @param appliedRange applied A1 range
	 * @param appliedAt applied timestamp
	 */
	public record SheetApplyResult(
		SheetSyncStatus status,
		String message,
		String appliedRange,
		LocalDateTime appliedAt
	){}
}
