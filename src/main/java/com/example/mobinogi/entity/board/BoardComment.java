package com.example.mobinogi.entity.board;

import com.example.mobinogi.entity.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "board_comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardComment{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "comment_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field commentId.
	 */
	private Long commentId;

	@Column(name = "post_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field postId.
	 */
	private Long postId;

	@Column(name = "user_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field userId.
	 */
	private Long userId;

	@Column(name = "parent_comment_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field parentCommentId.
	 */
	private Long parentCommentId;

	@Column(name = "content", nullable = false, columnDefinition = "TEXT")
	/**
	 * Field content.
	 */
	private String content;

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

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "post_id", insertable = false, updatable = false)
	/**
	 * Field post.
	 */
	private BoardPost post;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", insertable = false, updatable = false)
	/**
	 * Field user.
	 */
	private User user;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "parent_comment_id", insertable = false, updatable = false)
	/**
	 * Field parentComment.
	 */
	private BoardComment parentComment;

	/**
	 * Initializes timestamps before insert.
	 */
	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
		updatedAt = LocalDateTime.now();
	}

	/**
	 * Updates timestamp before update.
	 */
	@PreUpdate
	protected void onUpdate(){
		updatedAt = LocalDateTime.now();
	}
}

