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
public class BarterFilterRegionDto{
	/**
	 * Field regionId.
	 */
	private Long regionId;
	/**
	 * Field regionName.
	 */
	private String regionName;
	/**
	 * Field npcs.
	 */
	private List<BarterFilterNpcDto> npcs;
}
