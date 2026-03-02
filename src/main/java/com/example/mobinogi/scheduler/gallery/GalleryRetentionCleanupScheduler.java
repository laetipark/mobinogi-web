package com.example.mobinogi.scheduler.gallery;

import com.example.mobinogi.entity.board.PhotoBoardPost;
import com.example.mobinogi.entity.guild.UserGuildGalleryImage;
import com.example.mobinogi.repository.GuildGalleryImageRepository;
import com.example.mobinogi.repository.GuildGalleryLikeRepository;
import com.example.mobinogi.repository.PhotoBoardPostLikeRepository;
import com.example.mobinogi.repository.PhotoBoardPostRepository;
import com.example.mobinogi.service.file.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 소프트 삭제된 갤러리 데이터의 보존 기간 만료 하드 삭제 스케줄러입니다.
 *
 * <p>동작 범위:
 * <ul>
 *   <li>커뮤니티 갤러리(`photo_board_posts`)</li>
 *   <li>길드 갤러리(`user_guild_gallery`)</li>
 * </ul>
 *
 * <p>보존 기간이 지난 행을 DB에서 하드 삭제하고, 연결된 로컬 이미지(`/api/files/...`)도 함께 정리합니다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GalleryRetentionCleanupScheduler{

	/** 스케줄러 기본 타임존 */
	private static final ZoneId SEOUL_ZONE = ZoneId.of("Asia/Seoul");

	/** 로컬 파일 URL 접두어 */
	private static final String LOCAL_FILE_PREFIX = "/api/files/";

	/** 커뮤니티 갤러리 파일 URL 접두어 */
	private static final String BOARD_FILE_PREFIX = "/api/files/board/";

	/** 길드 갤러리 파일 URL 접두어 */
	private static final String GUILD_FILE_PREFIX = "/api/files/guild-";

	/** 커뮤니티 갤러리 게시글 저장소 */
	private final PhotoBoardPostRepository photoBoardPostRepository;

	/** 커뮤니티 갤러리 좋아요 저장소 */
	private final PhotoBoardPostLikeRepository photoBoardPostLikeRepository;

	/** 길드 갤러리 이미지 저장소 */
	private final GuildGalleryImageRepository guildGalleryImageRepository;

	/** 길드 갤러리 좋아요 저장소 */
	private final GuildGalleryLikeRepository guildGalleryLikeRepository;

	/** 파일 저장소 서비스 */
	private final FileStorageService fileStorageService;

	/** 스케줄러 활성화 여부 */
	@Value("${gallery.cleanup.enabled:true}")
	private boolean enabled;

	/** 보존 기간(일) */
	@Value("${gallery.cleanup.retention-days:30}")
	private int retentionDays;

	/** 한 번에 처리할 최대 건수 */
	@Value("${gallery.cleanup.batch-size:200}")
	private int batchSize;

	/**
	 * 매일 지정된 시각에 보존 기간 만료 데이터를 정리합니다.
	 */
	@Scheduled(cron = "${gallery.cleanup.cron:0 15 4 * * *}", zone = "Asia/Seoul")
	@Transactional
	public void cleanupExpiredGalleryRows(){
		runCleanup("scheduled");
	}

	/**
	 * 갤러리 데이터 정리 플로우를 실행합니다.
	 *
	 * @param trigger 실행 트리거 라벨
	 */
	private void runCleanup(String trigger){
		if(!enabled){
			log.debug("Skip gallery cleanup. reason=disabled, trigger={}", trigger);
			return;
		}

		int normalizedRetentionDays = retentionDays > 0 ? retentionDays : 30;
		int normalizedBatchSize = Math.clamp(batchSize, 1, 1000);
		LocalDateTime threshold = LocalDateTime.now(SEOUL_ZONE).minusDays(normalizedRetentionDays);

		CleanupCount photoCount = cleanupPhotoGallery(threshold, normalizedBatchSize);
		CleanupCount guildCount = cleanupGuildGallery(threshold, normalizedBatchSize);

		log.info(
			"Gallery cleanup completed. trigger={}, threshold={}, photoRows={}, photoFiles={}, guildRows={}, guildFiles={}",
			trigger,
			threshold,
			photoCount.deletedRows(),
			photoCount.deletedFiles(),
			guildCount.deletedRows(),
			guildCount.deletedFiles()
		);
	}

	/**
	 * 커뮤니티 갤러리 만료 데이터와 이미지를 정리합니다.
	 *
	 * @param threshold 삭제 만료 기준 시각
	 * @param normalizedBatchSize 배치 크기
	 * @return 삭제 카운트
	 */
	private CleanupCount cleanupPhotoGallery(LocalDateTime threshold, int normalizedBatchSize){
		int deletedRows = 0;
		int deletedFiles = 0;

		while(true){
			List<PhotoBoardPost> expiredRows =
				photoBoardPostRepository.findByDeletedAtIsNotNullAndDeletedAtLessThanEqualOrderByDeletedAtAsc(
					threshold,
					PageRequest.of(0, normalizedBatchSize)
				);
			if(expiredRows.isEmpty()){
				break;
			}

			List<Long> targetIds = expiredRows.stream()
				.map(PhotoBoardPost::getPhotoPostId)
				.filter(id -> id != null)
				.toList();
			Set<String> targetImageUrls = new LinkedHashSet<>();
			for(PhotoBoardPost row : expiredRows){
				for(String imageUrl : parseStoredImageUrls(row.getImageUrl())){
					if(imageUrl.startsWith(BOARD_FILE_PREFIX)){
						targetImageUrls.add(imageUrl);
					}
				}
			}

			if(!targetIds.isEmpty()){
				photoBoardPostLikeRepository.deleteByPhotoPostIdIn(targetIds);
				photoBoardPostRepository.deleteByPhotoPostIdIn(targetIds);
				deletedRows += targetIds.size();
			}
			deletedFiles += deleteFiles(targetImageUrls);
		}

		return new CleanupCount(deletedRows, deletedFiles);
	}

	/**
	 * 길드 갤러리 만료 데이터와 이미지를 정리합니다.
	 *
	 * @param threshold 삭제 만료 기준 시각
	 * @param normalizedBatchSize 배치 크기
	 * @return 삭제 카운트
	 */
	private CleanupCount cleanupGuildGallery(LocalDateTime threshold, int normalizedBatchSize){
		int deletedRows = 0;
		int deletedFiles = 0;

		while(true){
			List<UserGuildGalleryImage> expiredRows =
				guildGalleryImageRepository.findByDeletedAtIsNotNullAndDeletedAtLessThanEqualOrderByDeletedAtAsc(
					threshold,
					PageRequest.of(0, normalizedBatchSize)
				);
			if(expiredRows.isEmpty()){
				break;
			}

			List<Long> targetIds = expiredRows.stream()
				.map(UserGuildGalleryImage::getId)
				.filter(id -> id != null)
				.toList();
			Set<String> targetImageUrls = new LinkedHashSet<>();
			for(UserGuildGalleryImage row : expiredRows){
				for(String imageUrl : parseStoredImageUrls(row.getImageUrl())){
					if(imageUrl.startsWith(GUILD_FILE_PREFIX)){
						targetImageUrls.add(imageUrl);
					}
				}
			}

			if(!targetIds.isEmpty()){
				guildGalleryLikeRepository.deleteByGalleryImage_IdIn(targetIds);
				guildGalleryImageRepository.deleteByIdIn(targetIds);
				deletedRows += targetIds.size();
			}
			deletedFiles += deleteFiles(targetImageUrls);
		}

		return new CleanupCount(deletedRows, deletedFiles);
	}

	/**
	 * 저장 문자열을 줄바꿈 단위 URL 목록으로 파싱합니다.
	 *
	 * @param storedImageUrls 저장 문자열
	 * @return 파싱된 URL 목록
	 */
	private List<String> parseStoredImageUrls(String storedImageUrls){
		List<String> parsed = new ArrayList<>();
		if(storedImageUrls == null || storedImageUrls.isBlank()){
			return parsed;
		}
		String[] lines = storedImageUrls.split("\\R");
		for(String line : lines){
			if(line == null){
				continue;
			}
			String normalized = line.trim();
			if(normalized.isEmpty()){
				continue;
			}
			if(normalized.startsWith(LOCAL_FILE_PREFIX)){
				parsed.add(normalized);
			}
		}
		return parsed;
	}

	/**
	 * 파일 URL 집합을 삭제하고 성공 건수를 반환합니다.
	 *
	 * @param imageUrls 삭제 대상 파일 URL 집합
	 * @return 성공적으로 삭제된 파일 수
	 */
	private int deleteFiles(Set<String> imageUrls){
		int successCount = 0;
		for(String imageUrl : imageUrls){
			try{
				if(fileStorageService.deleteFile(imageUrl)){
					successCount += 1;
				}
			}catch(Exception e){
				log.warn("Failed to delete gallery file. url={}", imageUrl, e);
			}
		}
		return successCount;
	}

	/**
	 * 정리 작업 카운트 값입니다.
	 *
	 * @param deletedRows 삭제된 DB 행 수
	 * @param deletedFiles 삭제된 파일 수
	 */
	private record CleanupCount(int deletedRows, int deletedFiles){
	}
}
