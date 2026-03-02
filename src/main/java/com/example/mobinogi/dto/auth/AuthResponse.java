package com.example.mobinogi.dto.auth;

import com.example.mobinogi.dto.user.UserDto;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse{

	/**
	 * Field success.
	 */
	private boolean success;
	/**
	 * Field message.
	 */
	private String message;
	/**
	 * Field token.
	 */
	private String token;
	/**
	 * Field user.
	 */
	private UserDto user;
	/**
	 * Field isNewUser.
	 */
	private boolean isNewUser;
}
