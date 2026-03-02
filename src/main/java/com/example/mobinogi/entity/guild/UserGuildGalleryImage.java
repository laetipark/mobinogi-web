package com.example.mobinogi.entity.guild;

import com.example.mobinogi.entity.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_guild_gallery")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
/**
 * 길드 갤러리 이미지 엔티티입니다.
 */
public class UserGuildGalleryImage{

	/** 갤러리 이미지 PK */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "guild_gallery_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field id.
	 */
	private Long id;

	/** 소속 길드 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "guild_id",
		nullable = false,
		foreignKey = @ForeignKey(name = "fk_guild_gallery_image_guild")
	)
	/**
	 * Field guild.
	 */
	private UserGuild guild;

	/** 업로더 사용자 연관 엔티티 */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "user_id",
		foreignKey = @ForeignKey(name = "FK2ohklptqjgjkl1t90psb279p5")
	)
	@NotFound(action = NotFoundAction.IGNORE)
	/**
	 * Field uploader.
	 */
	private User uploader;

	/** 업로더 사용자 ID */
	@Column(name = "user_id", insertable = false, updatable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field uploaderUserId.
	 */
	private Long uploaderUserId;

	/** 줄바꿈 구분 이미지 URL 문자열 */
	@Lob
	@Column(name = "image_urls", nullable = false, columnDefinition = "LONGTEXT")
	/**
	 * Field imageUrl.
	 */
	private String imageUrl;

	/** 갤러리 제목 */
	@Column(name = "title", nullable = false, length = 200)
	/**
	 * Field title.
	 */
	private String title;

	/** 갤러리 설명 */
	@Column(name = "description", length = 1000)
	/**
	 * Field description.
	 */
	private String description;

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

	/**
	 * 엔티티 최초 저장 시 기본값을 초기화합니다.
	 */
	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
		updatedAt = LocalDateTime.now();
		if(likeCount == null){
			likeCount = 0;
		}
		if(viewCount == null){
			viewCount = 0;
		}
		if(title == null || title.isBlank()){
			title = "Gallery Image";
		}
	}

	/**
	 * 엔티티 수정 시 수정 시각을 갱신합니다.
	 */
	@PreUpdate
	protected void onUpdate(){
		updatedAt = LocalDateTime.now();
	}
}
