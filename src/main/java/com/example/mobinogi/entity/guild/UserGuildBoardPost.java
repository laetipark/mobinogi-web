package com.example.mobinogi.entity.guild;

import com.example.mobinogi.entity.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_guild_board")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGuildBoardPost{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "guild_board_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field id.
	 */
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "guild_id",
		nullable = false,
		foreignKey = @ForeignKey(name = "fk_guild_board_post_guild")
	)
	/**
	 * Field guild.
	 */
	private UserGuild guild;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "author_user_id",
		nullable = false,
		foreignKey = @ForeignKey(name = "fk_user_guild_board_author")
	)
	@NotFound(action = NotFoundAction.IGNORE)
	/**
	 * Field author.
	 */
	private User author;

	@Column(name = "author_user_id", insertable = false, updatable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field authorUserId.
	 */
	private Long authorUserId;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "category_id",
		foreignKey = @ForeignKey(name = "fk_user_guild_board_category")
	)
	@NotFound(action = NotFoundAction.IGNORE)
	/**
	 * Field category.
	 */
	private UserGuildBoardCategory category;

	@Column(name = "category_id", insertable = false, updatable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field categoryId.
	 */
	private Long categoryId;

	@Column(name = "title", nullable = false, length = 200)
	/**
	 * Field title.
	 */
	private String title;

	@Column(name = "content", nullable = false, length = 4000)
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
