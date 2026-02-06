package com.example.mobinogi.dto.auth;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KakaoLoginRequest{

	private Long kakaoId;
	private String nickname;
	private String email;
	private String profileImage;
}
