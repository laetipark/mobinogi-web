package com.example.mobinogi.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuildMemberRankRefreshStatusDto{

	/**
	 * Field guildId.
	 */
	private Long guildId;
	/**
	 * Field refreshing.
	 */
	private Boolean refreshing;
	/**
	 * Field status.
	 */
	private String status;
	/**
	 * Field requestedByUserId.
	 */
	private Long requestedByUserId;
	/**
	 * Field totalMemberCount.
	 */
	private Integer totalMemberCount;
	/**
	 * Field requestedCount.
	 */
	private Integer requestedCount;
	/**
	 * Field successCount.
	 */
	private Integer successCount;
	/**
	 * Field failedCount.
	 */
	private Integer failedCount;
	/**
	 * Field skippedCount.
	 */
	private Integer skippedCount;
	/**
	 * Field startedAt.
	 */
	private LocalDateTime startedAt;
	/**
	 * Field finishedAt.
	 */
	private LocalDateTime finishedAt;
	/**
	 * Field updatedAt.
	 */
	private LocalDateTime updatedAt;
	/**
	 * Field message.
	 */
	private String message;
}
