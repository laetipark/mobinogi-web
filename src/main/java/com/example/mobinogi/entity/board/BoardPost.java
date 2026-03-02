package com.example.mobinogi.entity.board;

import com.example.mobinogi.entity.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "board_posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardPost{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "post_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field postId.
	 */
	private Long postId;

	@Column(name = "category_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field categoryId.
	 */
	private Long categoryId;

	@Column(name = "user_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field userId.
	 */
	private Long userId;

	@Column(name = "title", nullable = false, length = 200)
	/**
	 * Field title.
	 */
	private String title;

	@Column(name = "content", nullable = false, columnDefinition = "LONGTEXT")
	/**
	 * Field content.
	 */
	private String content;

	@Column(name = "view_count")
	/**
	 * Field viewCount.
	 */
	private Integer viewCount;

	@Column(name = "is_wiki")
	/**
	 * Field isWiki.
	 */
	private Boolean isWiki;

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
	@JoinColumn(name = "category_id", insertable = false, updatable = false)
	/**
	 * Field category.
	 */
	private BoardCategory category;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", insertable = false, updatable = false)
	/**
	 * Field user.
	 */
	private User user;

	/**
	 * Initializes timestamps before insert.
	 */
	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
		updatedAt = LocalDateTime.now();
		if(viewCount == null) viewCount = 0;
		if(isWiki == null) isWiki = false;
	}

	/**
	 * Updates timestamp before update.
	 */
	@PreUpdate
	protected void onUpdate(){
		updatedAt = LocalDateTime.now();
	}
}

