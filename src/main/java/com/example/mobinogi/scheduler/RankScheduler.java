package com.example.mobinogi.scheduler;

import com.example.mobinogi.entity.GameClass;
import com.example.mobinogi.repository.GameClassRepository;
import com.example.mobinogi.service.rank.RankCollectService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Component
public class RankScheduler{
	
	private final RankCollectService rankCollectService;
	private final GameClassRepository gameClassRepository;
	
	// 적응형 지연 시간 관리
	private long currentDelay = 2000; // 초기 지연 시간 (ms)
	private final long MIN_DELAY = 1000; // 최소 지연 시간 (ms)
	private final long MAX_DELAY = 10000; // 최대 지연 시간 (ms)
	
	// 서버 인스턴스 분산 처리용 설정
	@Value("${server.instance.id:0}")
	private int serverInstanceId;
	
	@Value("${server.total.instances:1}")
	private int totalServerInstances;
	
	public RankScheduler(GameClassRepository gameClassRepository, RankCollectService rankCollectService){
		this.gameClassRepository = gameClassRepository;
		this.rankCollectService = rankCollectService;
	}
	
	@Transactional(isolation = Isolation.READ_COMMITTED)
	@Scheduled(cron = "0 20 * * * *") // 매 시간 20분마다 실행
	public void fetchRankData(){
		try{
			List<GameClass> allGameClasses = gameClassRepository.findAll(); // 전체 GameClass 목록 불러오기
			
			// 서버별로 작업 분할 - 연속된 구간으로 분할
			List<GameClass> myGameClasses = new ArrayList<>();
			int totalSize = allGameClasses.size();
			int chunkSize = (totalSize + totalServerInstances - 1) / totalServerInstances; // 올림 나누기
			int startIndex = serverInstanceId * chunkSize;
			int endIndex = Math.min(startIndex + chunkSize, totalSize);
			
			if(startIndex < totalSize){
				myGameClasses = allGameClasses.subList(startIndex, endIndex);
			}
			
			System.out.println("=== Server Instance " + serverInstanceId + " (" + (serverInstanceId + 1) + "/" + totalServerInstances + ") ===");
			System.out.println("Total GameClasses: " + allGameClasses.size() + ", My assignment: " + myGameClasses.size());
			
			if(myGameClasses.isEmpty()){
				System.out.println("No GameClasses assigned to this server instance.");
				return;
			}
			
			// 배치 처리 (5개씩 처리 후 잠시 휴식)
			List<List<GameClass>> batches = partitionList(myGameClasses, 5);
			
			int successCount = 0;
			int failureCount = 0;
			
			for(int batchIndex = 0 ; batchIndex < batches.size() ; batchIndex++){
				List<GameClass> batch = batches.get(batchIndex);
				System.out.println("Processing batch " + (batchIndex + 1) + "/" + batches.size() + " on server " + serverInstanceId);
				
				for(GameClass gameClass : batch){
					Long classId = gameClass.getClassId();
					try{
						processPagesWithAdaptiveRateLimit(classId);
						successCount++;
						System.out.println("ClassId " + classId + " completed successfully! (" + successCount + " completed)");
					}catch(Exception e){
						failureCount++;
						System.err.println("Failed to process classId: " + classId + " - " + e.getMessage() + " (" + failureCount + " failed)");
						// 개별 실패는 전체 작업을 중단하지 않음
					}
				}
				
				// 배치 간 휴식 시간 (마지막 배치 제외)
				if(batchIndex < batches.size() - 1){
					System.out.println("Resting between batches for 10 seconds...");
					try{
						TimeUnit.SECONDS.sleep(10);
					}catch(InterruptedException ie){
						Thread.currentThread().interrupt();
						System.err.println("Thread interrupted during batch rest");
						break;
					}
				}
			}
			
			System.out.println("Server " + serverInstanceId + " processing completed! Success: " + successCount + ", Failed: " + failureCount);
		}catch(Exception e){
			System.err.println("Critical error in scheduled task on server " + serverInstanceId + ": " + e.getMessage());
			throw new RuntimeException("Error occurred during scheduled task execution", e);
		}
	}
	
	// 적응형 속도 제한과 재시도 메커니즘이 적용된 페이지 처리
	private void processPagesWithAdaptiveRateLimit(Long classId){
		int consecutiveFailures = 0;
		final int MAX_CONSECUTIVE_FAILURES = 5; // 연속 실패 임계값
		
		for(int i = 1 ; i <= 50 ; i++){
			boolean pageProcessed = false;
			int retryCount = 0;
			final int MAX_RETRIES = 3;
			
			// 재시도 루프
			while(!pageProcessed && retryCount < MAX_RETRIES){
				try{
					rankCollectService.rankCollect(1, i, 2, classId.intValue());
					pageProcessed = true;
					
					// 성공 시 지연 시간 점진적 감소
					if(consecutiveFailures == 0 && currentDelay > MIN_DELAY){
						currentDelay = Math.max(MIN_DELAY, currentDelay - 50);
					}
					consecutiveFailures = 0;
					
					// 지정된 지연시간만큼 대기
					TimeUnit.MILLISECONDS.sleep(currentDelay);
					
				}catch(Exception e){
					retryCount++;
					consecutiveFailures++;
					
					System.err.println("Request failed for classId: " + classId + ", page: " + i +
						", attempt: " + retryCount + "/" + MAX_RETRIES + " - " + e.getMessage());
					
					if(retryCount < MAX_RETRIES){
						// 지수 백오프: 재시도 간격을 점진적으로 증가
						long retryDelay = currentDelay + (1000 * retryCount);
						try{
							TimeUnit.MILLISECONDS.sleep(retryDelay);
						}catch(InterruptedException ie){
							Thread.currentThread().interrupt();
							throw new RuntimeException("Thread interrupted during retry delay", ie);
						}
					}else{
						// 최대 재시도 횟수 도달
						System.err.println("Max retries reached for classId: " + classId + ", page: " + i + ". Skipping this page.");
						
						// 실패 시 지연 시간 증가
						currentDelay = Math.min(MAX_DELAY, currentDelay + (200 * consecutiveFailures));
						
						// 너무 많은 연속 실패 시 전체 classId 처리 중단
						if(consecutiveFailures >= MAX_CONSECUTIVE_FAILURES){
							throw new RuntimeException("Too many consecutive failures (" + consecutiveFailures +
								") for classId: " + classId + ". Aborting this classId.");
						}
						
						// 실패한 페이지를 건너뛰고 다음 페이지로 진행
						break;
					}
				}
			}
		}
		
		System.out.println("ClassId " + classId + " processing completed!");
	}
	
	// 리스트를 n개씩 나누는 유틸리티 메서드
	private <T> List<List<T>> partitionList(List<T> list, int size){
		return IntStream.range(0, (list.size() + size - 1) / size)
			.mapToObj(i -> list.subList(i * size, Math.min((i + 1) * size, list.size())))
			.collect(Collectors.toList());
	}
}