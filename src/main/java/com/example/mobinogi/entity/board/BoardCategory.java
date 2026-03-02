package com.example.mobinogi.entity.board;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "board_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardCategory{
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "category_id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field categoryId.
	 */
	private Long categoryId;
	
	@Column(name = "category_name", nullable = false, unique = true, length = 50)
	/**
	 * Field categoryName.
	 */
	private String categoryName;
	
	@Column(name = "category_order")
	/**
	 * Field categoryOrder.
	 */
	private Integer categoryOrder;
	
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

