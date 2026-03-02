package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.user.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * User profile DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto{

	/** User ID. */
	private Long userId;

	/** Kakao ID. */
	private Long kakaoId;

	/** Nickname. */
	private String nickname;

	/** Profile image URL. */
	private String profileImage;

	/** Admin flag. */
	private Boolean isAdmin;

	/** Auth provider name. */
	private String provider;

	/** Account created timestamp. */
	private LocalDateTime createdAt;

	/**
	 * Converts user entity to DTO.
	 *
	 * @param user user entity
	 * @return DTO instance
	 */
	public static UserDto fromEntity(User user){
		return UserDto.builder()
			.userId(user.getUserId())
			.kakaoId(user.getKakaoId())
			.nickname(user.getNickname())
			.profileImage(user.getProfileImage())
			.isAdmin(user.getIsAdmin())
			.provider("kakao")
			.createdAt(user.getCreatedAt())
			.build();
	}
}
