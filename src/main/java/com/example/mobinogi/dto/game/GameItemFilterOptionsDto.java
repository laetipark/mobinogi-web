package com.example.mobinogi.dto.game;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class GameItemFilterOptionsDto{
	private List<String> itemTypes;
	private List<String> itemRarities;
}
