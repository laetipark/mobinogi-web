package com.example.mobinogi.entity.guild;

import com.example.mobinogi.entity.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
	name = "user_guild_gallery_likes",
	uniqueConstraints = {
		@UniqueConstraint(name = "uk_user_guild_gallery_likes_image_user", columnNames = {"guild_gallery_id", "user_id"})
	}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGuildGalleryLike{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "guild_gallery_like_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field id.
	 */
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "guild_gallery_id",
		nullable = false,
		foreignKey = @ForeignKey(name = "fk_user_guild_gallery_likes_gallery")
	)
	/**
	 * Field galleryImage.
	 */
	private UserGuildGalleryImage galleryImage;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "user_id",
		nullable = false,
		foreignKey = @ForeignKey(name = "fk_user_guild_gallery_likes_user")
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
