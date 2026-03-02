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

	private Long guildId;
	private Integer totalMemberCount;
	private Integer requestedCount;
	private Integer successCount;
	private Integer failedCount;
	private Integer skippedCount;
	private LocalDateTime refreshedAt;
}
