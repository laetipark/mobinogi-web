package com.example.mobinogi.dto.game;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CraftFilterTypeDto{
	/**
	 * Field craftType.
	 */
	private String craftType;
	/**
	 * Field craftNames.
	 */
	private List<String> craftNames;
}
