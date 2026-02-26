package com.example.mobinogi.entity;

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
public class PhotoBoardPost{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "photo_post_id", columnDefinition = "BIGINT UNSIGNED")
	private Long photoPostId;

	@Column(name = "user_id", columnDefinition = "BIGINT UNSIGNED")
	private Long userId;

	@Column(name = "title", nullable = false, length = 200)
	private String title;

	@Column(name = "description", length = 1000)
	private String description;

	@Column(name = "image_url", nullable = false, length = 500)
	private String imageUrl;

	@Column(name = "tags", length = 500)
	private String tags;

	@Column(name = "view_count")
	private Integer viewCount;

	@Column(name = "like_count")
	private Integer likeCount;

	@Column(name = "source_type", length = 20)
	private String sourceType;

	@Column(name = "external_id", length = 255)
	private String externalId;

	@Column(name = "external_url", length = 500)
	private String externalUrl;

	@Column(name = "external_author", length = 100)
	private String externalAuthor;

	@Column(name = "created_at", updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at")
	private LocalDateTime updatedAt;

	@Column(name = "deleted_at")
	private LocalDateTime deletedAt;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", insertable = false, updatable = false)
	private User user;

	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
		updatedAt = LocalDateTime.now();
		if(viewCount == null) viewCount = 0;
		if(likeCount == null) likeCount = 0;
		if(sourceType == null) sourceType = "USER";
	}

	@PreUpdate
	protected void onUpdate(){
		updatedAt = LocalDateTime.now();
	}
}
