package com.example.mobinogi.scheduler;

import com.example.mobinogi.service.discord.DiscordSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DiscordSyncScheduler{

	private final DiscordSyncService discordSyncService;

	@EventListener(ApplicationReadyEvent.class)
	public void onApplicationReady(){
		log.info("서버 시작 - Discord 캐시 초기 로드...");
		discordSyncService.syncDiscordChannels();
	}

	@Scheduled(cron = "0 30 * * * *")
	public void syncDiscordChannels(){
		log.info("Discord 동기화 스케줄러 시작...");
		discordSyncService.syncDiscordChannels();
	}
}
