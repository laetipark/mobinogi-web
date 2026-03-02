package com.example.mobinogi.dto.game;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ItemEditSuggestionCreateRequest{
	/**
	 * Field itemName.
	 */
	private String itemName;
	/**
	 * Field targetType.
	 */
	private String targetType;
	/**
	 * Field targetRecordId.
	 */
	private Long targetRecordId;
	/**
	 * Field fieldKey.
	 */
	private String fieldKey;
	/**
	 * Field currentValue.
	 */
	private String currentValue;
	/**
	 * Field suggestedValue.
	 */
	private String suggestedValue;
	/**
	 * Field reason.
	 */
	private String reason;
}
