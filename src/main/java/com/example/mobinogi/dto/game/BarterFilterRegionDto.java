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
	private Long regionId;
	private String regionName;
	private List<BarterFilterNpcDto> npcs;
}
