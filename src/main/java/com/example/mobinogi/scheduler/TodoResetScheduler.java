package com.example.mobinogi.scheduler;

import com.example.mobinogi.service.user.UserTodoBarterService;
import com.example.mobinogi.service.user.UserTodoService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Component
public class TodoResetScheduler{

	private final UserTodoService userTodoService;
	private final UserTodoBarterService userTodoBarterService;

	public TodoResetScheduler(UserTodoService userTodoService, UserTodoBarterService userTodoBarterService){
		this.userTodoService = userTodoService;
		this.userTodoBarterService = userTodoBarterService;
	}

	@Scheduled(cron = "0 0 6 * * *", zone = "Asia/Seoul")
	public void dailyReset(){
		try{
			LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));

			if(now.getDayOfWeek() == DayOfWeek.MONDAY){
				// 월요일: 주간 + 일일 리셋
				userTodoService.resetWeekly();
				userTodoBarterService.resetWeeklyCompleted();
				System.out.println("Weekly + Daily todo reset completed.");
			}else{
				// 나머지 요일: 일일 리셋만
				userTodoService.resetDaily();
				userTodoBarterService.resetDailyCompleted();
				System.out.println("Daily todo reset completed.");
			}
		}catch(Exception e){
			System.err.println("Todo reset failed: " + e.getMessage());
			e.printStackTrace();
		}
	}
}
