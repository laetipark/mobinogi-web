package com.example.mobinogi.dto.user;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCharacterRequest{

	private String characterName;
	private Integer serverId;
	private Long classId;
}
