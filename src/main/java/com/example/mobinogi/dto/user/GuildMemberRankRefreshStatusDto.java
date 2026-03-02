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

	private Long guildId;
	private Boolean refreshing;
	private String status;
	private Long requestedByUserId;
	private Integer totalMemberCount;
	private Integer requestedCount;
	private Integer successCount;
	private Integer failedCount;
	private Integer skippedCount;
	private LocalDateTime startedAt;
	private LocalDateTime finishedAt;
	private LocalDateTime updatedAt;
	private String message;
}
