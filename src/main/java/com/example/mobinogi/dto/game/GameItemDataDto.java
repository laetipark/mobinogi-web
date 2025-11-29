package com.example.mobinogi.dto.game;

import com.example.mobinogi.entity.LifeBarter;
import com.example.mobinogi.entity.LifeCraft;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GameItemDataDto{
	private String itemName;
	private List<LifeBarter> bartersByItemId;
	private List<LifeBarter> bartersByExchangeId;
	private Map<Integer, List<LifeCraft>> craftsBySubId;
}
