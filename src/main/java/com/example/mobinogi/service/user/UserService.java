package com.example.mobinogi.service.user;

import com.example.mobinogi.dto.auth.AuthResponse;
import com.example.mobinogi.dto.auth.KakaoLoginRequest;
import com.example.mobinogi.dto.user.UserDto;
import com.example.mobinogi.entity.User;
import com.example.mobinogi.repository.UserRepository;
import com.example.mobinogi.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService{

	private final UserRepository userRepository;
	private final JwtUtil jwtUtil;

	@Transactional
	public AuthResponse kakaoLogin(KakaoLoginRequest request){
		Optional<User> existingUser = userRepository.findByKakaoIdAndDeletedAtIsNull(request.getKakaoId());

		boolean isNewUser = existingUser.isEmpty();
		User user;

		if(isNewUser){
			user = User.builder()
				.kakaoId(request.getKakaoId())
				.nickname(request.getNickname())
				.email(request.getEmail())
				.profileImage(request.getProfileImage())
				.build();
			user = userRepository.save(user);
		}else{
			// 기존 회원은 닉네임을 덮어쓰지 않음 (카카오에서 프로필을 못 가져오면 "User"가 되는 문제 방지)
			user = existingUser.get();
		}

		String token = jwtUtil.generateToken(user.getUserId(), user.getKakaoId());

		return AuthResponse.builder()
			.success(true)
			.message(isNewUser ? "회원가입이 완료되었습니다." : "로그인 성공")
			.token(token)
			.user(UserDto.fromEntity(user))
			.isNewUser(isNewUser)
			.build();
	}

	@Transactional(readOnly = true)
	public UserDto getUserById(Long userId){
		User user = userRepository.findByUserIdAndDeletedAtIsNull(userId)
			.orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
		return UserDto.fromEntity(user);
	}

	@Transactional(readOnly = true)
	public UserDto getUserByKakaoId(Long kakaoId){
		User user = userRepository.findByKakaoIdAndDeletedAtIsNull(kakaoId)
			.orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
		return UserDto.fromEntity(user);
	}

	@Transactional(readOnly = true)
	public boolean existsByKakaoId(Long kakaoId){
		return userRepository.findByKakaoIdAndDeletedAtIsNull(kakaoId).isPresent();
	}

	@Transactional
	public UserDto updateProfile(Long userId, String nickname, String profileImage){
		User user = userRepository.findByUserIdAndDeletedAtIsNull(userId)
			.orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

		if(nickname != null && !nickname.trim().isEmpty()){
			user.setNickname(nickname.trim());
		}
		if(profileImage != null){
			user.setProfileImage(profileImage.trim().isEmpty() ? null : profileImage.trim());
		}

		user = userRepository.save(user);
		return UserDto.fromEntity(user);
	}

	@Transactional(readOnly = true)
	public User findById(Long userId){
		return userRepository.findByUserIdAndDeletedAtIsNull(userId)
			.orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
	}

	@Transactional
	public User save(User user){
		return userRepository.save(user);
	}
}
