package com.example.mobinogi.dto.game;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ItemEditSuggestionCreateRequest{
	private String itemName;
	private String targetType;
	private Long targetRecordId;
	private String fieldKey;
	private String currentValue;
	private String suggestedValue;
	private String reason;
}
