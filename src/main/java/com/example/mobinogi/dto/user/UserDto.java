package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.User;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto{

	private Long userId;
	private Long kakaoId;
	private String nickname;
	private String email;
	private String profileImage;
	private String provider;
	private LocalDateTime createdAt;

	public static UserDto fromEntity(User user){
		return UserDto.builder()
			.userId(user.getUserId())
			.kakaoId(user.getKakaoId())
			.nickname(user.getNickname())
			.email(user.getEmail())
			.profileImage(user.getProfileImage())
			.provider("kakao")
			.createdAt(user.getCreatedAt())
			.build();
	}
}
