package com.example.mobinogi.scheduler;

import com.example.mobinogi.service.util.GoogleSheetsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;

@Component
public class GoogleSheetScheduler{
	
	private final GoogleSheetsService sheetService;
	
	@Value("${server.instance.id:0}")
	private int instanceId;
	
	public GoogleSheetScheduler(GoogleSheetsService sheetService){
		this.sheetService = sheetService;
	}
	
	@Transactional
	@Scheduled(cron = "0 */5 * * * *") // 5분 단위로 실행
	public void fetchSheetData(){
		if(instanceId != 0){
			return;
		}
		
		try{
			sheetService.fetchAndSaveItem();
			sheetService.fetchAndSaveNpc();
			sheetService.fetchAndSaveRegion();
			sheetService.fetchAndSaveBarter();
			sheetService.fetchAndSaveCraft();
			System.out.println("Data saved to DB.");
		}catch(IOException e){
			e.printStackTrace();
		}
	}
}