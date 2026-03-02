package com.example.mobinogi.entity.guild;

import com.example.mobinogi.entity.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;

import java.time.LocalDateTime;

@Entity
@Table(
	name = "user_guild_board_categories",
	uniqueConstraints = {
		@UniqueConstraint(name = "uk_user_guild_board_categories_guild_name", columnNames = {"guild_id", "name"})
	}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGuildBoardCategory{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "guild_board_category_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field id.
	 */
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "guild_id",
		nullable = false,
		foreignKey = @ForeignKey(name = "fk_user_guild_board_categories_guild")
	)
	/**
	 * Field guild.
	 */
	private UserGuild guild;

	@Column(name = "name", nullable = false, length = 60)
	/**
	 * Field name.
	 */
	private String name;

	@Column(name = "sort_order")
	/**
	 * Field sortOrder.
	 */
	private Integer sortOrder;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(
		name = "created_by_user_id",
		foreignKey = @ForeignKey(name = "fk_user_guild_board_categories_created_by")
	)
	@NotFound(action = NotFoundAction.IGNORE)
	/**
	 * Field createdBy.
	 */
	private User createdBy;

	@Column(name = "created_by_user_id", insertable = false, updatable = false, columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field createdByUserId.
	 */
	private Long createdByUserId;

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
	 * Initializes default values before insert.
	 */
	@PrePersist
	protected void onCreate(){
		createdAt = LocalDateTime.now();
		updatedAt = LocalDateTime.now();
		if(sortOrder == null){
			sortOrder = 0;
		}
	}

	/**
	 * Updates timestamp before update.
	 */
	@PreUpdate
	protected void onUpdate(){
		updatedAt = LocalDateTime.now();
	}
}
