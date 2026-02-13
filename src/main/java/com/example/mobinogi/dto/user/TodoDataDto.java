package com.example.mobinogi.dto.user;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

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
	private TodoSettings settings;
	private List<TodoMemo> dailyMemos;
	private List<TodoMemo> weeklyMemos;

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class DailyTasks{
		@Builder.Default
		private Boolean dayDungeon = false;
		@Builder.Default
		private Boolean freeShopPurchase = false;
		@Builder.Default
		private Boolean gemTreasureChest = false;
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
		private BossProgress abyss;
		@Builder.Default
		private Integer abyssReward = 0;
		@Builder.Default
		private Integer abyssRewardMax = 4;
		private BossProgress raid;
		private Vanguard vanguard;
	}

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class Vanguard{
		@Builder.Default
		private Integer reward = 0;
		@Builder.Default
		private Integer emergency = 0;
		@Builder.Default
		private Boolean quest = false;
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

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class TodoSettings{
		@Builder.Default
		private List<String> dailyOrder = Collections.emptyList();
		@Builder.Default
		private List<String> weeklyOrder = Collections.emptyList();
		@Builder.Default
		private List<String> hiddenTasks = Collections.emptyList();
	}

	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class TodoMemo{
		private String id;
		private String label;
		@Builder.Default
		private Boolean completed = false;
	}

	private static List<TodoMemo> resetMemos(List<TodoMemo> memos){
		if(memos == null) return null;
		return memos.stream()
			.map(m -> TodoMemo.builder().id(m.getId()).label(m.getLabel()).completed(false).build())
			.collect(Collectors.toList());
	}

	public static TodoDataDto createDefault(){
		return TodoDataDto.builder()
			.daily(DailyTasks.builder()
				.dayDungeon(false)
				.freeShopPurchase(false)
				.gemTreasureChest(false)
				.build())
			.weekly(WeeklyTasks.builder()
				.summoningBarrier(0)
				.blackHole(0)
				.phantomTower(PhantomTower.builder().floor(1).stage(1).build())
				.fieldBoss(BossProgress.builder().completed(new ArrayList<>()).tracked(new ArrayList<>()).build())
				.abyss(BossProgress.builder().completed(new ArrayList<>()).tracked(new ArrayList<>()).build())
				.abyssReward(0)
				.abyssRewardMax(4)
				.raid(BossProgress.builder().completed(new ArrayList<>()).tracked(new ArrayList<>()).build())
				.vanguard(Vanguard.builder().reward(0).emergency(0).quest(false).build())
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
				.freeShopPurchase(false)
				.gemTreasureChest(false)
				.build())
			.weekly(existing.getWeekly())
			.resources(existing.getResources())
			.settings(existing.getSettings())
			.dailyMemos(resetMemos(existing.getDailyMemos()))
			.weeklyMemos(existing.getWeeklyMemos())
			.build();
	}

	public static TodoDataDto createWeeklyReset(TodoDataDto existing){
		Resources existingResources = existing != null ? existing.getResources() : null;
		// tracked, 설정 보존
		List<Integer> fieldBossTracked = new ArrayList<>();
		List<Integer> raidTracked = new ArrayList<>();
		List<Integer> abyssTracked = new ArrayList<>();
		Integer abyssRewardMax = 4;
		if(existing != null && existing.getWeekly() != null){
			if(existing.getWeekly().getFieldBoss() != null && existing.getWeekly().getFieldBoss().getTracked() != null){
				fieldBossTracked = existing.getWeekly().getFieldBoss().getTracked();
			}
			if(existing.getWeekly().getRaid() != null && existing.getWeekly().getRaid().getTracked() != null){
				raidTracked = existing.getWeekly().getRaid().getTracked();
			}
			if(existing.getWeekly().getAbyss() != null && existing.getWeekly().getAbyss().getTracked() != null){
				abyssTracked = existing.getWeekly().getAbyss().getTracked();
			}
			if(existing.getWeekly().getAbyssRewardMax() != null){
				abyssRewardMax = existing.getWeekly().getAbyssRewardMax();
			}
		}

		TodoSettings existingSettings = existing != null ? existing.getSettings() : null;

		return TodoDataDto.builder()
			.daily(DailyTasks.builder()
				.dayDungeon(false)
				.freeShopPurchase(false)
				.gemTreasureChest(false)
				.build())
			.weekly(WeeklyTasks.builder()
				.summoningBarrier(0)
				.blackHole(0)
				.phantomTower(PhantomTower.builder().floor(1).stage(1).build())
				.fieldBoss(BossProgress.builder().completed(new ArrayList<>()).tracked(fieldBossTracked).build())
				.abyss(BossProgress.builder().completed(new ArrayList<>()).tracked(abyssTracked).build())
				.abyssReward(0)
				.abyssRewardMax(abyssRewardMax)
				.raid(BossProgress.builder().completed(new ArrayList<>()).tracked(raidTracked).build())
				.vanguard(Vanguard.builder().reward(0).emergency(0).quest(false).build())
				.build())
			.resources(existingResources != null ? existingResources :
				Resources.builder()
					.silverCoin(CounterTask.builder().current(0).build())
					.demonTribute(CounterTask.builder().current(0).build())
					.build())
			.settings(existingSettings)
			.dailyMemos(resetMemos(existing != null ? existing.getDailyMemos() : null))
			.weeklyMemos(resetMemos(existing != null ? existing.getWeeklyMemos() : null))
			.build();
	}
}
