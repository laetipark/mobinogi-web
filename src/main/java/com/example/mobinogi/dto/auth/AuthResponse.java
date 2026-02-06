package com.example.mobinogi.dto.auth;

import com.example.mobinogi.dto.user.UserDto;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse{

	private boolean success;
	private String message;
	private String token;
	private UserDto user;
	private boolean isNewUser;
}
