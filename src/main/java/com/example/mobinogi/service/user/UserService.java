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
		if(request.getKakaoId() == null){
			throw new IllegalArgumentException("kakaoId is required");
		}

		Optional<User> existingUser = userRepository.findByKakaoId(request.getKakaoId());

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
			user = existingUser.get();

			// Reactivate soft-deleted users to avoid duplicate kakao_id insert failures.
			if(user.getDeletedAt() != null){
				user.setDeletedAt(null);
				if(request.getNickname() != null && !request.getNickname().trim().isEmpty()){
					user.setNickname(request.getNickname().trim());
				}
				if(request.getEmail() != null){
					user.setEmail(request.getEmail());
				}
				if(request.getProfileImage() != null){
					user.setProfileImage(request.getProfileImage());
				}
				user = userRepository.save(user);
			}
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
