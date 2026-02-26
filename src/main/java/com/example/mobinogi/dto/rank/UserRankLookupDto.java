package com.example.mobinogi.dto.rank;

import com.example.mobinogi.entity.UserRank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRankLookupDto{

	private static final Map<Integer, String> SERVER_NAMES = Map.of(
		1, "데이안", 2, "아이라", 3, "던컨", 4, "알리사",
		5, "메이븐", 6, "라사", 7, "칼릭스"
	);

	private Integer serverId;
	private String serverName;
	private String userName;
	private Integer classId;
	private Integer userPower;
	private Integer userVitality;
	private Integer userAttractiveness;
	private LocalDateTime updatedAt;

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
