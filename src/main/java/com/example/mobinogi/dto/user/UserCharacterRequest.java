package com.example.mobinogi.dto.user;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCharacterRequest{

	/**
	 * Field characterName.
	 */
	private String characterName;
	/**
	 * Field serverId.
	 */
	private Integer serverId;
	/**
	 * Field classId.
	 */
	private Long classId;
}
