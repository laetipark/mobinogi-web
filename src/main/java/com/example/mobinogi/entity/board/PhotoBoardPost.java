package com.example.mobinogi.entity.board;

import com.example.mobinogi.entity.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "photo_board_posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
/**
 * 커뮤니티 포토 게시글 엔티티입니다.
 */
public class PhotoBoardPost{

	/** 게시글 PK */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "photo_post_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field photoPostId.
	 */
	private Long photoPostId;

	/** 작성자 사용자 ID */
	@Column(name = "user_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field userId.
	 */
	private Long userId;

	/** 게시글 제목 */
	@Column(name = "title", nullable = false, length = 200)
	/**
	 * Field title.
	 */
	private String title;

	/** 게시글 설명 */
	@Column(name = "description", length = 1000)
	/**
	 * Field description.
	 */
	private String description;

	/** 줄바꿈 구분 이미지 URL 문자열 */
	@Lob
	@Column(name = "image_urls", nullable = false, columnDefinition = "LONGTEXT")
	/**
	 * Field imageUrl.
	 */
	private String imageUrl;

	/** 쉼표 구분 태그 문자열 */
	@Column(name = "tags", length = 500)
	/**
	 * Field tags.
	 */
	private String tags;

	/** 조회수 */
	@Column(name = "view_count")
	/**
	 * Field viewCount.
	 */
	private Integer viewCount;

	/** 좋아요 수 */
	@Column(name = "like_count")
	/**
	 * Field likeCount.
	 */
	private Integer likeCount;

	/** 생성 시각 */
	@Column(name = "created_at", updatable = false)
	/**
	 * Field createdAt.
	 */
	private LocalDateTime createdAt;

	/** 수정 시각 */
	@Column(name = "updated_at")
	/**
	 * Field updatedAt.
	 */
	private LocalDateTime updatedAt;

	/** 소프트 삭제 시각 */
	@Column(name = "deleted_at")
	/**
	 * Field deletedAt.
	 */
	private LocalDateTime deletedAt;

	/** 작성자 연관 엔티티 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "user_id",
		insertable = false,
		updatable = false,
		foreignKey = @ForeignKey(name = "fk_photo_board_posts_user")
	)
	/**
	 * Field user.
	 */
	private User user;

	/**
	 * 엔티티 최초 저장 시 기본값을 초기화합니다.
	 */
	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
		updatedAt = LocalDateTime.now();
		// 조회수/좋아요 미지정 시 0으로 초기화합니다.
		if(viewCount == null) viewCount = 0;
		if(likeCount == null) likeCount = 0;
	}

	/**
	 * 엔티티 수정 시 수정 시각을 갱신합니다.
	 */
	@PreUpdate
	protected void onUpdate(){
		updatedAt = LocalDateTime.now();
	}
}

