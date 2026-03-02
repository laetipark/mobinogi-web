package com.example.mobinogi.entity.board;

import com.example.mobinogi.entity.user.User;
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
	/**
	 * Field photoPostLikeId.
	 */
	private Long photoPostLikeId;

	@Column(name = "photo_post_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field photoPostId.
	 */
	private Long photoPostId;

	@Column(name = "user_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field userId.
	 */
	private Long userId;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "photo_post_id",
		insertable = false,
		updatable = false,
		foreignKey = @ForeignKey(name = "fk_photo_board_post_likes_post")
	)
	/**
	 * Field photoPost.
	 */
	private PhotoBoardPost photoPost;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "user_id",
		insertable = false,
		updatable = false,
		foreignKey = @ForeignKey(name = "fk_photo_board_post_likes_user")
	)
	/**
	 * Field user.
	 */
	private User user;

	@Column(name = "created_at", updatable = false)
	/**
	 * Field createdAt.
	 */
	private LocalDateTime createdAt;

	/**
	 * Initializes timestamp before insert.
	 */
	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
	}
}

