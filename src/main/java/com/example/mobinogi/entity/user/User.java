package com.example.mobinogi.entity.user;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "user_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field userId.
	 */
	private Long userId;

	@Column(name = "kakao_id", unique = true, nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field kakaoId.
	 */
	private Long kakaoId;

	@Column(name = "nickname", length = 100)
	/**
	 * Field nickname.
	 */
	private String nickname;

	@Column(name = "profile_image", length = 500)
	/**
	 * Field profileImage.
	 */
	private String profileImage;

	@Column(name = "is_admin")
	/**
	 * Field isAdmin.
	 */
	private Boolean isAdmin;

	@Column(name = "created_at", updatable = false)
	/**
	 * Field createdAt.
	 */
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	/**
	 * Field updatedAt.
	 */
	private LocalDateTime updatedAt;

	@Column(name = "deleted_at")
	/**
	 * Field deletedAt.
	 */
	private LocalDateTime deletedAt;

	/**
	 * Initializes default values before insert.
	 */
	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
		updatedAt = LocalDateTime.now();
		if(isAdmin == null){
			isAdmin = false;
		}
	}

	/**
	 * Updates timestamp before update.
	 */
	@PreUpdate
	protected void onUpdate(){
		updatedAt = LocalDateTime.now();
	}
}

