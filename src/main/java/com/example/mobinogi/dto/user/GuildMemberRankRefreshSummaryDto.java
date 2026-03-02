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
public class GuildMemberRankRefreshSummaryDto{

	/**
	 * Field guildId.
	 */
	private Long guildId;
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
	 * Field refreshedAt.
	 */
	private LocalDateTime refreshedAt;
}
