package com.example.mobinogi.scheduler;

import com.example.mobinogi.service.notion.NotionSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotionSyncScheduler{

	private final NotionSyncService notionSyncService;

	@EventListener(ApplicationReadyEvent.class)
	public void onApplicationReady(){
		log.info("서버 시작 - Notion 캐시 초기 로드...");
		notionSyncService.syncNotionPages();
	}

	@Scheduled(cron = "0 0 * * * *")
	public void syncNotionPages(){
		log.info("Notion 동기화 스케줄러 시작...");
		notionSyncService.syncNotionPages();
	}
}
