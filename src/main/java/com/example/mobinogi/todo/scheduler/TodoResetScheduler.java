package com.example.mobinogi.todo.scheduler;

import com.example.mobinogi.todo.service.UserTodoBarterService;
import com.example.mobinogi.todo.service.UserTodoService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Component
public class TodoResetScheduler{

	/** 일반 TODO 리셋 서비스 */
	private final UserTodoService userTodoService;

	/** 물물교환 TODO 리셋 서비스 */
	private final UserTodoBarterService userTodoBarterService;

	/**
	 * 스케줄러 의존성을 초기화합니다.
	 *
	 * @param userTodoService 일반 TODO 서비스
	 * @param userTodoBarterService 물물교환 TODO 서비스
	 */
	public TodoResetScheduler(UserTodoService userTodoService, UserTodoBarterService userTodoBarterService){
		this.userTodoService = userTodoService;
		this.userTodoBarterService = userTodoBarterService;
	}

	/**
	 * 매일 오전 6시(Asia/Seoul)에 TODO 리셋을 실행합니다.
	 * 월요일에는 주간+일일 리셋을 함께 수행합니다.
	 */
	@Scheduled(cron = "0 0 6 * * *", zone = "Asia/Seoul")
	public void dailyReset(){
		try{
			LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Seoul"));

			if(now.getDayOfWeek() == DayOfWeek.MONDAY){
				// 월요일: 주간 + 일일 리셋 수행
				userTodoService.resetWeekly();
				userTodoBarterService.resetWeeklyCompleted();
				System.out.println("Weekly + Daily todo reset completed.");
			}else{
				// 그 외 요일: 일일 리셋만 수행
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


