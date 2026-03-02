package com.example.mobinogi.dto.rank;

import com.example.mobinogi.entity.user.UserRank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * User rank lookup DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRankLookupDto{

	/** Server-id to display-name mapping. */
	private static final Map<Integer, String> SERVER_NAMES = Map.of(
		1, "데이안", 2, "아이라", 3, "던컨", 4, "알리사",
		5, "메이븐", 6, "라사", 7, "칼릭스"
	);

	/** Server ID. */
	private Integer serverId;

	/** Server display name. */
	private String serverName;

	/** Character nickname. */
	private String userName;

	/** Class ID. */
	private Integer classId;

	/** Power stat. */
	private Integer userPower;

	/** Vitality stat. */
	private Integer userVitality;

	/** Attractiveness stat. */
	private Integer userAttractiveness;

	/** Last updated timestamp. */
	private LocalDateTime updatedAt;

	/**
	 * Converts rank entity to lookup DTO.
	 *
	 * @param userRank user rank entity
	 * @return lookup DTO
	 */
	public static UserRankLookupDto fromEntity(UserRank userRank){
		return UserRankLookupDto.builder()
			.serverId(userRank.getServerId())
			.serverName(SERVER_NAMES.getOrDefault(userRank.getServerId(), "알 수 없음"))
			.userName(userRank.getUserName())
			.classId(userRank.getClassId())
			.userPower(userRank.getUserPower())
			.userVitality(userRank.getUserVitality())
			.userAttractiveness(userRank.getUserAttractiveness())
			.updatedAt(userRank.getUpdatedAt())
			.build();
	}
}
