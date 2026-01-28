package com.example.mobinogi.scheduler;

import com.example.mobinogi.service.util.GoogleSheetsService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;

@Component
public class GoogleSheetScheduler{
	
	private final GoogleSheetsService sheetService;
	
	public GoogleSheetScheduler(GoogleSheetsService sheetService){
		this.sheetService = sheetService;
	}
	
	@Transactional
	@Scheduled(cron = "0 0 */6 * * *")
	public void fetchSheetData(){
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
