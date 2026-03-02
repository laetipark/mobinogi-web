package com.example.mobinogi.dto.user;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ProfileUpdateRequest{
	/**
	 * Field nickname.
	 */
	private String nickname;
	/**
	 * Field profileImage.
	 */
	private String profileImage;
}
