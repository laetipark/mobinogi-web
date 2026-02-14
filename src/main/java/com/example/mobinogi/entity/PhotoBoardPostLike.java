package com.example.mobinogi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
	name = "photo_board_post_likes",
	uniqueConstraints = {
		@UniqueConstraint(name = "uk_photo_board_post_likes_post_user", columnNames = {"photo_post_id", "user_id"})
	}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhotoBoardPostLike{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "photo_post_like_id", columnDefinition = "BIGINT UNSIGNED")
	private Long photoPostLikeId;

	@Column(name = "photo_post_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long photoPostId;

	@Column(name = "user_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long userId;

	@Column(name = "created_at", updatable = false)
	private LocalDateTime createdAt;

	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
	}
}
