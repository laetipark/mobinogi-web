package com.example.mobinogi.entity.life;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
	name = "hole_alarm",
	indexes = {
		@Index(name = "idx_hole_alarm_type", columnList = "hole_type"),
		@Index(name = "idx_hole_alarm_region", columnList = "region_name"),
		@Index(name = "idx_hole_alarm_end", columnList = "hole_end_time")
	}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HoleAlarm{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
	/**
	 * Field id.
	 */
	private Long id;

	@Enumerated(EnumType.STRING)
	@Column(name = "hole_type", nullable = false, length = 10)
	/**
	 * Field holeType.
	 */
	private HoleType holeType;

	@Column(name = "region_name", length = 100)
	/**
	 * Field regionName.
	 */
	private String regionName;

	@Column(name = "hole_count")
	/**
	 * Field holeCount.
	 */
	private Integer holeCount;

	@Column(name = "hole_end_time", columnDefinition = "DATETIME")
	/**
	 * Field holeEndTime.
	 */
	private LocalDateTime holeEndTime;

	@Column(name = "abyss_open_time", columnDefinition = "DATETIME")
	/**
	 * Field abyssOpenTime.
	 */
	private LocalDateTime abyssOpenTime;

	@Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
	/**
	 * Field createdAt.
	 */
	private LocalDateTime createdAt;

	@Column(name = "updated_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
	/**
	 * Field updatedAt.
	 */
	private LocalDateTime updatedAt;

	/**
	 * Initializes timestamps before insert.
	 */
	@PrePersist
	public void prePersist(){
		this.createdAt = LocalDateTime.now();
		this.updatedAt = LocalDateTime.now();
	}

	/**
	 * Updates timestamp before update.
	 */
	@PreUpdate
	public void preUpdate(){
		this.updatedAt = LocalDateTime.now();
	}
}
