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
	private String craftType;
	private List<String> craftNames;
}
