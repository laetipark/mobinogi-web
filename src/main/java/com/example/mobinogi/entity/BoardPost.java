package com.example.mobinogi.entity;

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
	@Column(name = "post_id")
	private Long postId;

	@Column(name = "category_id")
	private Long categoryId;

	@Column(name = "user_id")
	private Long userId;

	@Column(name = "title", nullable = false, length = 200)
	private String title;

	@Column(name = "content", nullable = false, columnDefinition = "TEXT")
	private String content;

	@Column(name = "view_count")
	private Integer viewCount;

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
	@JoinColumn(name = "category_id", insertable = false, updatable = false)
	private BoardCategory category;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", insertable = false, updatable = false)
	private User user;

	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
		updatedAt = LocalDateTime.now();
		if(viewCount == null) viewCount = 0;
		if(sourceType == null) sourceType = "USER";
	}

	@PreUpdate
	protected void onUpdate(){
		updatedAt = LocalDateTime.now();
	}
}
