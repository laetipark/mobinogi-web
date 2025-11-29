package com.example.mobinogi.service.util;

import com.example.mobinogi.entity.*;
import com.example.mobinogi.repository.*;
import com.example.mobinogi.service.game.GameItemService;
import com.google.api.services.sheets.v4.Sheets;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.sql.Timestamp;
import java.util.List;

@Service
public class GoogleSheetsService{
	
	private final GameItemRepository gameItemRepository;
	private final GameNpcRepository gameNpcRepository;
	private final GameRegionRepository gameRegionRepository;
	private final LifeBarterRepository lifeBarterRepository;
	private final LifeCraftRepository lifeCraftRepository;
	private final Sheets sheets;
	private final GameItemService gameItemService;
	
	@Value("${google.sheets.id}")
	private String SPREADSHEET_ID; // 실제 스프레드시트 ID로 변경 필요
	
	public GoogleSheetsService(
		GameItemRepository gameItemRepository,
		GameNpcRepository gameNpcRepository,
		GameRegionRepository gameRegionRepository,
		LifeBarterRepository lifeBarterRepository,
		LifeCraftRepository lifeCraftRepository,
		Sheets sheets,
		GameItemService gameItemService
	){
		this.gameItemRepository = gameItemRepository;
		this.gameNpcRepository = gameNpcRepository;
		this.gameRegionRepository = gameRegionRepository;
		this.lifeBarterRepository = lifeBarterRepository;
		this.lifeCraftRepository = lifeCraftRepository;
		this.sheets = sheets;
		this.gameItemService = gameItemService;
	}
	
	@Transactional
	public void fetchAndSaveItem() throws IOException{
		List<List<Object>> data = readSheet("item!A2:D");
		int rowIndex = 1; // item_id 시작값
		
		for(List<Object> row : data){
			String itemName = row.get(2).toString().trim();
			if(itemName.isEmpty())
				continue;
			
			GameItem item = new GameItem();
			item.setItemId(rowIndex);
			item.setItemType(row.get(0).toString());
			item.setItemRarity(row.get(1).toString());
			item.setItemName(itemName);
			if(row.size() > 3 && row.get(3) != null && !row.get(3).toString().trim().isEmpty()){
				item.setItemEffect(row.get(3).toString().trim());
			}
			
			gameItemRepository.save(item);
			rowIndex++;
		}
		
		gameItemService.deleteGameItemSafely(rowIndex);
	}
	
	@Transactional
	public void fetchAndSaveNpc() throws IOException{
		List<List<Object>> data = readSheet("npc!A2:C");
		int rowIndex = 1; // item_id 시작값
		
		for(List<Object> row : data){
			String npcName = row.get(2).toString().trim();
			if(npcName.isEmpty() || row.getFirst().toString().trim().equals("#N/A"))
				continue;
			
			GameNpc item = new GameNpc();
			item.setNpcId(rowIndex);
			item.setRegionId(Integer.valueOf(row.getFirst().toString()));
			item.setNpcName(npcName);
			
			gameNpcRepository.save(item);
			rowIndex++;
		}
		
		// ✅ rowIndex 이후의 기존 아이템 삭제
		gameNpcRepository.deleteByNpcIdGreaterThanEqual(rowIndex);
	}
	
	@Transactional
	public void fetchAndSaveRegion() throws IOException{
		List<List<Object>> data = readSheet("region!A2:A");
		int rowIndex = 1; // item_id 시작값
		
		for(List<Object> row : data){
			String regionName = row.getFirst().toString().trim();
			if(regionName.isEmpty())
				continue;
			
			GameRegion item = new GameRegion();
			item.setRegionId(rowIndex);
			item.setRegionName(regionName);
			
			gameRegionRepository.save(item);
			rowIndex++;
		}
		
		// ✅ rowIndex 이후의 기존 아이템 삭제
		gameRegionRepository.deleteByRegionIdGreaterThanEqual(rowIndex);
	}
	
	@Transactional
	public void fetchAndSaveBarter() throws IOException{
		List<List<Object>> data = readSheet("barter!A2:O");
		int rowIndex = 1; // item_id 시작값
		
		for(List<Object> row : data){
			LifeBarter item = new LifeBarter();
			
			if(row.getFirst().toString().trim().equals("#N/A")){
				continue;
			}
			
			item.setBarterId(rowIndex);
			item.setRegionId(Integer.valueOf(row.getFirst().toString()));
			item.setNpcId(Integer.valueOf(row.get(2).toString()));
			item.setItemId(Integer.valueOf(row.get(4).toString()));
			item.setItemWeight(Integer.valueOf(row.get(6).toString()));
			item.setExchangeId(Integer.valueOf(row.get(7).toString()));
			item.setExchangeCost(Integer.valueOf(row.get(9).toString()));
			item.setBarterQty(Integer.valueOf(row.get(10).toString()));
			
			if(row.size() > 11 && row.get(11) != null && !row.get(11).toString().trim().isEmpty()){
				item.setBarterInitCycle(Integer.valueOf(row.get(11).toString()));
			}
			if(row.size() > 12 && row.get(12) != null && !row.get(12).toString().trim().isEmpty()){
				System.out.println("row.get(12).toString(): " + row.get(12).toString());
				item.setBarterInitDate(Timestamp.valueOf(row.get(12).toString()));
			}
			if(row.size() > 13 && row.get(13) != null && !row.get(13).toString().trim().isEmpty()){
				item.setBarterInitDay(Byte.valueOf(row.get(13).toString()));
			}
			if(row.size() > 14 && row.get(14) != null && !row.get(14).toString().trim().isEmpty()){
				item.setBarterEtc(row.get(14).toString().trim());
			}
			
			lifeBarterRepository.save(item);
			rowIndex++;
		}
		
		// ✅ rowIndex 이후의 기존 아이템 삭제
		lifeBarterRepository.deleteByBarterIdGreaterThanEqual(rowIndex);
	}
	
	@Transactional
	public void fetchAndSaveCraft() throws IOException{
		List<List<Object>> data = readSheet("craft!A2:O");
		int rowIndex = 1; // item_id 시작값
		
		for(List<Object> row : data){
			LifeCraft item = new LifeCraft();
			
			if(row.getFirst().toString().trim().equals("#N/A")){
				continue;
			}
			
			item.setCraftId(rowIndex);
			item.setCraftSubId(Integer.valueOf(row.get(5).toString()));
			item.setItemId(Integer.valueOf(row.getFirst().toString()));
			item.setCraftIngredientId(Integer.valueOf(row.get(2).toString()));
			item.setCraftIngredientCost(Integer.valueOf(row.get(4).toString()));
			
			lifeCraftRepository.save(item);
			rowIndex++;
		}
		
		// ✅ rowIndex 이후의 기존 아이템 삭제
		lifeCraftRepository.deleteByCraftIdGreaterThanEqual(rowIndex);
	}
	
	public List<List<Object>> readSheet(String range) throws IOException{
		return sheets.spreadsheets().values()
			.get(SPREADSHEET_ID, range)
			.execute()
			.getValues();
	}
}
