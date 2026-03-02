package com.example.mobinogi.dto.auth;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KakaoLoginRequest{

	/**
	 * Field kakaoId.
	 */
	private Long kakaoId;
	/**
	 * Field nickname.
	 */
	private String nickname;
	/**
	 * Field profileImage.
	 */
	private String profileImage;
}
