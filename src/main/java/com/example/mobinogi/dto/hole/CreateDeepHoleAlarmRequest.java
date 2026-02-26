package com.example.mobinogi.dto.hole;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class CreateDeepHoleAlarmRequest{

	private String regionName;

	@JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
	private LocalDateTime endTime;

	private Integer holeCount;
}
