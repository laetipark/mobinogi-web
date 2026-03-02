package com.example.mobinogi.todo.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Aggregated TODO payload used by the user TODO API.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TodoDataDto{

	/** Daily task section. */
	private DailyTasks daily;

	/** Weekly task section. */
	private WeeklyTasks weekly;

	/** Resource/counter task section. */
	private Resources resources;

	/** UI settings (order/hidden tasks). */
	private TodoSettings settings;

	/** Daily memo list. */
	private List<TodoMemo> dailyMemos;

	/** Weekly memo list. */
	private List<TodoMemo> weeklyMemos;

	/**
	 * Daily boolean task flags.
	 */
	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class DailyTasks{

		/** Day dungeon completion flag. */
		@Builder.Default
		/**
		 * Field dayDungeon.
		 */
		private Boolean dayDungeon = false;

		/** Free shop purchase completion flag. */
		@Builder.Default
		/**
		 * Field freeShopPurchase.
		 */
		private Boolean freeShopPurchase = false;

		/** Gem treasure chest completion flag. */
		@Builder.Default
		/**
		 * Field gemTreasureChest.
		 */
		private Boolean gemTreasureChest = false;
	}

	/**
	 * Counter-style task payload.
	 */
	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class CounterTask{

		/** Current counter value. */
		@Builder.Default
		/**
		 * Field current.
		 */
		private Integer current = 0;

		/** Last charge timestamp text. */
		private String lastChargeTime;
	}

	/**
	 * Resource counters.
	 */
	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class Resources{

		/** Silver coin counter. */
		private CounterTask silverCoin;

		/** Demon tribute counter. */
		private CounterTask demonTribute;
	}

	/**
	 * Weekly task payload.
	 */
	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class WeeklyTasks{

		/** Summoning barrier completion count. */
		@Builder.Default
		/**
		 * Field summoningBarrier.
		 */
		private Integer summoningBarrier = 0;

		/** Black hole completion count. */
		@Builder.Default
		/**
		 * Field blackHole.
		 */
		private Integer blackHole = 0;

		/** Phantom tower progress. */
		private PhantomTower phantomTower;

		/** Field boss progress. */
		private BossProgress fieldBoss;

		/** Abyss progress. */
		private BossProgress abyss;

		/** Abyss reward count. */
		@Builder.Default
		/**
		 * Field abyssReward.
		 */
		private Integer abyssReward = 0;

		/** Max abyss reward count. */
		@Builder.Default
		/**
		 * Field abyssRewardMax.
		 */
		private Integer abyssRewardMax = 4;

		/** Raid progress. */
		private BossProgress raid;

		/** Vanguard progress. */
		private Vanguard vanguard;
	}

	/**
	 * Vanguard task payload.
	 */
	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class Vanguard{

		/** Reward completion count. */
		@Builder.Default
		/**
		 * Field reward.
		 */
		private Integer reward = 0;

		/** Emergency completion count. */
		@Builder.Default
		/**
		 * Field emergency.
		 */
		private Integer emergency = 0;

		/** Quest completion flag. */
		@Builder.Default
		/**
		 * Field quest.
		 */
		private Boolean quest = false;
	}

	/**
	 * Phantom tower progress payload.
	 */
	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class PhantomTower{

		/** Current floor. */
		@Builder.Default
		/**
		 * Field floor.
		 */
		private Integer floor = 1;

		/** Current stage. */
		@Builder.Default
		/**
		 * Field stage.
		 */
		private Integer stage = 1;
	}

	/**
	 * Boss progress payload.
	 */
	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class BossProgress{

		/** Completed index list. */
		@Builder.Default
		private List<Integer> completed = new ArrayList<>();

		/** Tracked index list. */
		@Builder.Default
		private List<Integer> tracked = new ArrayList<>();
	}

	/**
	 * TODO UI settings payload.
	 */
	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class TodoSettings{

		/** Daily task order key list. */
		@Builder.Default
		private List<String> dailyOrder = Collections.emptyList();

		/** Weekly task order key list. */
		@Builder.Default
		private List<String> weeklyOrder = Collections.emptyList();

		/** Hidden task key list. */
		@Builder.Default
		private List<String> hiddenTasks = Collections.emptyList();
	}

	/**
	 * TODO memo payload.
	 */
	@Getter
	@Setter
	@NoArgsConstructor
	@AllArgsConstructor
	@Builder
	public static class TodoMemo{

		/** Memo ID. */
		private String id;

		/** Memo label text. */
		private String label;

		/** Completion flag. */
		@Builder.Default
		/**
		 * Field completed.
		 */
		private Boolean completed = false;
	}

	/**
	 * Resets completion flags of memo list items to false.
	 *
	 * @param memos source memo list
	 * @return copied memo list with reset completion state
	 */
	private static List<TodoMemo> resetMemos(List<TodoMemo> memos){
		if(memos == null){
			return null;
		}
		return memos.stream()
			.map(m -> TodoMemo.builder().id(m.getId()).label(m.getLabel()).completed(false).build())
			.collect(Collectors.toList());
	}

	/**
	 * Creates the default TODO template.
	 *
	 * @return initialized TODO payload
	 */
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

	/**
	 * Builds daily-reset result while preserving weekly/resources/settings.
	 *
	 * @param existing current TODO payload
	 * @return daily-reset TODO payload
	 */
	public static TodoDataDto createDailyReset(TodoDataDto existing){
		TodoDataDto base = existing != null ? existing : createDefault();
		WeeklyTasks weekly = base.getWeekly() != null ? base.getWeekly() : createDefault().getWeekly();
		Resources resources = base.getResources() != null ? base.getResources() : createDefault().getResources();

		return TodoDataDto.builder()
			.daily(DailyTasks.builder()
				.dayDungeon(false)
				.freeShopPurchase(false)
				.gemTreasureChest(false)
				.build())
			.weekly(weekly)
			.resources(resources)
			.settings(base.getSettings())
			.dailyMemos(resetMemos(base.getDailyMemos()))
			.weeklyMemos(base.getWeeklyMemos())
			.build();
	}

	/**
	 * Builds weekly-reset result while preserving tracked indexes/settings/resources.
	 *
	 * @param existing current TODO payload
	 * @return weekly-reset TODO payload
	 */
	public static TodoDataDto createWeeklyReset(TodoDataDto existing){
		Resources existingResources = existing != null ? existing.getResources() : null;

		// Preserve tracked boss indexes across weekly reset.
		List<Integer> fieldBossTracked = new ArrayList<>();
		List<Integer> raidTracked = new ArrayList<>();
		List<Integer> abyssTracked = new ArrayList<>();
		Integer abyssRewardMax = 4;

		if(existing != null && existing.getWeekly() != null){
			if(existing.getWeekly().getFieldBoss() != null && existing.getWeekly().getFieldBoss().getTracked() != null){
				fieldBossTracked = new ArrayList<>(existing.getWeekly().getFieldBoss().getTracked());
			}
			if(existing.getWeekly().getRaid() != null && existing.getWeekly().getRaid().getTracked() != null){
				raidTracked = new ArrayList<>(existing.getWeekly().getRaid().getTracked());
			}
			if(existing.getWeekly().getAbyss() != null && existing.getWeekly().getAbyss().getTracked() != null){
				abyssTracked = new ArrayList<>(existing.getWeekly().getAbyss().getTracked());
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
