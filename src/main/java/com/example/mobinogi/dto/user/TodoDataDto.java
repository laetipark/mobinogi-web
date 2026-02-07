package com.example.mobinogi.dto.user;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TodoDataDto{

	private DailyTasks daily;
	private WeeklyTasks weekly;
	private Resources resources;

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class DailyTasks{
		@Builder.Default
		private Boolean dayDungeon = false;
	}

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class CounterTask{
		@Builder.Default
		private Integer current = 0;
		private String lastChargeTime;
	}

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class Resources{
		private CounterTask silverCoin;
		private CounterTask demonTribute;
	}

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class WeeklyTasks{
		@Builder.Default
		private Integer summoningBarrier = 0;
		@Builder.Default
		private Integer blackHole = 0;
		private PhantomTower phantomTower;
		private BossProgress fieldBoss;
		@Builder.Default
		private Integer abyss = 0;
		private BossProgress raid;
	}

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class PhantomTower{
		@Builder.Default
		private Integer floor = 1;
		@Builder.Default
		private Integer stage = 1;
	}

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class BossProgress{
		@Builder.Default
		private List<Integer> completed = new ArrayList<>();
		@Builder.Default
		private List<Integer> tracked = new ArrayList<>();
	}

	public static TodoDataDto createDefault(){
		return TodoDataDto.builder()
			.daily(DailyTasks.builder()
				.dayDungeon(false)
				.build())
			.weekly(WeeklyTasks.builder()
				.summoningBarrier(0)
				.blackHole(0)
				.phantomTower(PhantomTower.builder().floor(1).stage(1).build())
				.fieldBoss(BossProgress.builder().completed(new ArrayList<>()).tracked(new ArrayList<>()).build())
				.abyss(0)
				.raid(BossProgress.builder().completed(new ArrayList<>()).tracked(new ArrayList<>()).build())
				.build())
			.resources(Resources.builder()
				.silverCoin(CounterTask.builder().current(0).build())
				.demonTribute(CounterTask.builder().current(0).build())
				.build())
			.build();
	}

	public static TodoDataDto createDailyReset(TodoDataDto existing){
		return TodoDataDto.builder()
			.daily(DailyTasks.builder()
				.dayDungeon(false)
				.build())
			.weekly(existing.getWeekly())
			.resources(existing.getResources())
			.build();
	}

	public static TodoDataDto createWeeklyReset(TodoDataDto existing){
		Resources existingResources = existing != null ? existing.getResources() : null;
		// tracked 보존
		List<Integer> fieldBossTracked = new ArrayList<>();
		List<Integer> raidTracked = new ArrayList<>();
		if(existing != null && existing.getWeekly() != null){
			if(existing.getWeekly().getFieldBoss() != null && existing.getWeekly().getFieldBoss().getTracked() != null){
				fieldBossTracked = existing.getWeekly().getFieldBoss().getTracked();
			}
			if(existing.getWeekly().getRaid() != null && existing.getWeekly().getRaid().getTracked() != null){
				raidTracked = existing.getWeekly().getRaid().getTracked();
			}
		}

		return TodoDataDto.builder()
			.daily(DailyTasks.builder()
				.dayDungeon(false)
				.build())
			.weekly(WeeklyTasks.builder()
				.summoningBarrier(0)
				.blackHole(0)
				.phantomTower(PhantomTower.builder().floor(1).stage(1).build())
				.fieldBoss(BossProgress.builder().completed(new ArrayList<>()).tracked(fieldBossTracked).build())
				.abyss(0)
				.raid(BossProgress.builder().completed(new ArrayList<>()).tracked(raidTracked).build())
				.build())
			.resources(existingResources != null ? existingResources :
				Resources.builder()
					.silverCoin(CounterTask.builder().current(0).build())
					.demonTribute(CounterTask.builder().current(0).build())
					.build())
			.build();
	}
}
