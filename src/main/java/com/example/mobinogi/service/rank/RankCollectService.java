package com.example.mobinogi.service.rank;

import com.example.mobinogi.entity.GameClass;
import com.example.mobinogi.entity.UserRank;
import com.example.mobinogi.repository.GameClassRepository;
import com.example.mobinogi.repository.UserRankRepository;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.zip.GZIPInputStream;
import java.io.ByteArrayInputStream;

@Service
public class RankCollectService{
	
	private final UserRankRepository userRankRepository;
	private final GameClassRepository gameClassRepository;
	
	private static final Logger logger = LoggerFactory.getLogger(RankCollectService.class);
	
	// 클래스 코드 캐시 추가
	private final Map<String, Integer> classCodeCache = new ConcurrentHashMap<>();
	
	// Rate Limiting
	private static final ReentrantLock rateLimitLock = new ReentrantLock();
	private static volatile long lastRequestTime = 0;
	private static final long MIN_REQUEST_INTERVAL = 12000; // 12초
	private static volatile int consecutiveErrors = 0;
	
	// HttpClient
	private final HttpClient client;
	private final CookieManager cookieManager;
	private volatile boolean cookiesInitialized = false;
	private volatile String currentUserAgent = null;
	
	// Docker Ubuntu 환경용 User Agents (Linux 우선)
	private static final String[] USER_AGENTS = {
		"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		"Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
		"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
		"Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0",
		"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
		"Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
	};
	
	// 추가: 세션 타임스탬프 추적
	private volatile long cookieInitializedTime = 0;
	private static final long SESSION_EXPIRY_MS = 600000; // 10분
	
	public RankCollectService(UserRankRepository userRankRepository, GameClassRepository gameClassRepository){
		this.userRankRepository = userRankRepository;
		this.gameClassRepository = gameClassRepository;
		
		logger.info("Initializing RankCollectService for Docker environment (OpenJDK 21)");
		
		// CookieManager 설정
		this.cookieManager = new CookieManager();
		cookieManager.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
		
		// Docker 컨테이너 환경에 최적화된 HttpClient
		this.client = HttpClient.newBuilder()
			.cookieHandler(cookieManager)
			.followRedirects(HttpClient.Redirect.NORMAL)
			.connectTimeout(Duration.ofSeconds(30))
			.version(HttpClient.Version.HTTP_2) // HTTP/2로 변경 (현대 브라우저)
			.build();
		
		logger.info("HttpClient initialized successfully");
	}
	
	/**
	 * Docker 환경에 최적화된 세션 쿠키 초기화 (개선 버전)
	 */
	private boolean initializeCookies(){
		// 기존 쿠키가 유효하고 만료되지 않았다면 재사용
		if(cookiesInitialized && (System.currentTimeMillis() - cookieInitializedTime) < SESSION_EXPIRY_MS){
			logger.debug("Reusing existing valid cookies (age: {}ms)",
				System.currentTimeMillis() - cookieInitializedTime);
			return true;
		}
		
		try{
			logger.info("Initializing session cookies in Docker environment...");
			
			// 기존 쿠키 완전 삭제
			cookieManager.getCookieStore().removeAll();
			
			// User Agent 고정 (세션 유지를 위해) - Docker Ubuntu 환경
			currentUserAgent = getRandomUserAgent();
			logger.debug("Using User-Agent: {}", currentUserAgent);
			
			// 1. 메인 페이지 방문 (더 많은 헤더 추가)
			HttpRequest mainPageRequest = HttpRequest.newBuilder()
				.uri(URI.create("https://mabinogimobile.nexon.com/"))
				.header("User-Agent", currentUserAgent)
				.header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
				.header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
				.header("Accept-Encoding", "gzip, deflate, br")
				.header("Upgrade-Insecure-Requests", "1")
				.header("Sec-Fetch-Dest", "document")
				.header("Sec-Fetch-Mode", "navigate")
				.header("Sec-Fetch-Site", "none")
				.header("Sec-Fetch-User", "?1")
				.header("Cache-Control", "max-age=0")
				.timeout(Duration.ofSeconds(30))
				.GET()
				.build();
			
			logger.debug("Sending main page request...");
			HttpResponse<byte[]> mainResponse = client.send(mainPageRequest, HttpResponse.BodyHandlers.ofByteArray());
			logger.info("Main page response: {} (Size: {} bytes)",
				mainResponse.statusCode(), mainResponse.body().length);
			
			if(mainResponse.statusCode() != 200 && mainResponse.statusCode() != 302){
				logger.error("Failed to access main page: {}", mainResponse.statusCode());
				return false;
			}
			
			// 쿠키 즉시 확인
			int cookiesAfterMain = cookieManager.getCookieStore().getCookies().size();
			logger.info("Cookies after main page: {}", cookiesAfterMain);
			
			// 더 긴 대기 (사람처럼)
			Thread.sleep(3000 + (int) (Math.random() * 2000)); // 3-5초
			
			// 2. 랭킹 페이지 방문 (개선된 헤더)
			HttpRequest rankingPageRequest = HttpRequest.newBuilder()
				.uri(URI.create("https://mabinogimobile.nexon.com/Ranking/List?t=4"))
				.header("User-Agent", currentUserAgent)
				.header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
				.header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
				.header("Accept-Encoding", "gzip, deflate, br")
				.header("Referer", "https://mabinogimobile.nexon.com/")
				.header("Upgrade-Insecure-Requests", "1")
				.header("Sec-Fetch-Dest", "document")
				.header("Sec-Fetch-Mode", "navigate")
				.header("Sec-Fetch-Site", "same-origin")
				.header("Sec-Fetch-User", "?1")
				.header("Cache-Control", "max-age=0")
				.timeout(Duration.ofSeconds(30))
				.GET()
				.build();
			
			logger.debug("Sending ranking page request...");
			HttpResponse<byte[]> rankingResponse = client.send(rankingPageRequest, HttpResponse.BodyHandlers.ofByteArray());
			logger.info("Ranking page response: {} (Size: {} bytes)",
				rankingResponse.statusCode(), rankingResponse.body().length);
			
			// 403 응답 내용 확인 (디버깅용)
			if(rankingResponse.statusCode() == 403){
				try{
					String body403 = decodeResponse(rankingResponse);
					logger.warn("403 Response preview: {}",
						body403.substring(0, Math.min(500, body403.length())));
					
					// Cloudflare/WAF 감지
					if(body403.contains("cloudflare") || body403.contains("cf-ray")){
						logger.error("⚠ Blocked by Cloudflare");
					}else if(body403.contains("captcha") || body403.contains("challenge")){
						logger.error("⚠ CAPTCHA/Challenge detected");
					}else if(body403.contains("Access Denied")){
						logger.error("⚠ Access Denied by WAF");
					}
				}catch(Exception e){
					logger.debug("Failed to decode 403 response: {}", e.getMessage());
				}
			}
			
			// 403이어도 쿠키가 설정되었을 수 있으므로 계속 진행
			if(rankingResponse.statusCode() != 200 && rankingResponse.statusCode() != 302 && rankingResponse.statusCode() != 403){
				logger.error("Unexpected ranking page status: {}", rankingResponse.statusCode());
				return false;
			}
			
			// 3. 쿠키 확인
			int cookieCount = cookieManager.getCookieStore().getCookies().size();
			logger.info("Total cookies acquired: {}", cookieCount);
			
			if(cookieCount > 0){
				cookieManager.getCookieStore().getCookies().forEach(cookie -> {
					logger.debug("Cookie: {} = {} (Domain: {}, Path: {})",
						cookie.getName(),
						cookie.getValue().length() > 10 ? "***" : cookie.getValue(),
						cookie.getDomain(),
						cookie.getPath());
				});
			}else{
				logger.warn("No cookies were set - this may cause issues");
			}
			
			// 더 긴 대기 (사람처럼 행동)
			Thread.sleep(5000 + (int) (Math.random() * 3000)); // 5-8초
			
			// 쿠키 유효성 테스트
			boolean isValid = testCookieValidity();
			
			if(isValid){
				cookiesInitialized = true;
				cookieInitializedTime = System.currentTimeMillis();
				logger.info("✓ Session cookies initialized successfully");
				return true;
			}else{
				logger.warn("Cookie validation failed - but will try to proceed");
				// 쿠키가 있으면 일단 시도
				if(cookieCount > 0){
					cookiesInitialized = true;
					cookieInitializedTime = System.currentTimeMillis();
					return true;
				}
				return false;
			}
			
		}catch(Exception e){
			logger.error("Failed to initialize cookies in Docker: {} - {}",
				e.getClass().getSimpleName(), e.getMessage());
			if(e.getCause() != null){
				logger.error("Root cause: {}", e.getCause().getMessage());
			}
			return false;
		}
	}
	
	/**
	 * 쿠키 유효성 테스트 (더 관대한 검증)
	 */
	private boolean testCookieValidity(){
		try{
			logger.info("Testing cookie validity...");
			
			String testPostData = "t=4&pageno=1&s=1&c=0&search=";
			
			HttpRequest testRequest = HttpRequest.newBuilder()
				.uri(URI.create("https://mabinogimobile.nexon.com/Ranking/List/rankdata"))
				.header("User-Agent", currentUserAgent)
				.header("Accept", "application/json, text/javascript, */*; q=0.01")
				.header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
				.header("Accept-Encoding", "gzip, deflate, br")
				.header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
				.header("Origin", "https://mabinogimobile.nexon.com")
				.header("Referer", "https://mabinogimobile.nexon.com/Ranking/List?t=4")
				.header("X-Requested-With", "XMLHttpRequest")
				.header("Sec-Fetch-Dest", "empty")
				.header("Sec-Fetch-Mode", "cors")
				.header("Sec-Fetch-Site", "same-origin")
				.timeout(Duration.ofSeconds(30))
				.POST(HttpRequest.BodyPublishers.ofString(testPostData))
				.build();
			
			HttpResponse<byte[]> testResponse = client.send(testRequest, HttpResponse.BodyHandlers.ofByteArray());
			
			logger.info("Cookie validity test: {} (Size: {} bytes)",
				testResponse.statusCode(), testResponse.body().length);
			
			// 403 상세 로깅
			if(testResponse.statusCode() == 403){
				try{
					String body403 = decodeResponse(testResponse);
					logger.warn("403 in validation - Response sample: {}",
						body403.substring(0, Math.min(300, body403.length())));
				}catch(Exception e){
					logger.debug("Failed to decode 403: {}", e.getMessage());
				}
			}
			
			if(testResponse.statusCode() == 200){
				if(testResponse.body().length > 50){
					String body = decodeResponse(testResponse);
					
					if(body.contains("<ul class=\"list\">") ||
						body.contains("class=\"item\"") ||
						body.contains("결과가 없습니다") ||
						body.contains("list") ||
						body.length() > 100){
						logger.info("✓ Cookie validation successful!");
						return true;
					}else{
						logger.warn("Suspicious response format (length: {})", body.length());
						logger.debug("Response preview: {}",
							body.substring(0, Math.min(200, body.length())));
						// 응답이 있으면 유효하다고 간주
						return true;
					}
				}
			}else if(testResponse.statusCode() == 403){
				logger.warn("403 during validation - cookies may be invalid");
				return false;
			}
			
			// 다른 상태 코드는 일단 유효하다고 간주
			logger.warn("Unexpected validation status: {}", testResponse.statusCode());
			return true;
			
		}catch(Exception e){
			logger.error("Cookie validation error: {} - {}",
				e.getClass().getSimpleName(), e.getMessage());
			return false;
		}
	}
	
	/**
	 * 랭킹 데이터 수집 (쿠키 만료 체크 추가)
	 *
	 * @param t      랭킹 타입 (1: 전투력, 2: 매력, 3: 생활력, 4: 종합)
	 * @param pageno 페이지 번호
	 * @param s      서버 ID (1: 데이안, 2: 아이라, 3: 던컨, 4: 알리사, 5: 메이블, 6: 라사, 7: 칼릭스)
	 * @param c      클래스 ID (0: 전체)
	 */
	@Transactional
	public void rankCollect(int t, int pageno, int s, int c){
		try{
			logger.info("Starting rank collection: type={}, page={}, server={}, class={}",
				t, pageno, s, c);
			
			// 쿠키 초기화 확인 (만료 시간 체크 추가)
			long sessionAge = System.currentTimeMillis() - cookieInitializedTime;
			if(!cookiesInitialized || consecutiveErrors >= 3 || sessionAge > SESSION_EXPIRY_MS){
				logger.info("Reinitializing cookies (errors: {}, session age: {}ms)...",
					consecutiveErrors, sessionAge);
				cookiesInitialized = false;
				cookieInitializedTime = 0;
				
				if(!initializeCookies()){
					throw new RuntimeException("Failed to initialize session cookies in Docker environment");
				}
				Thread.sleep(3000); // 더 긴 대기
			}
			
			// POST 데이터 생성
			String postData = String.format("t=%d&pageno=%d&s=%d&c=%d&search=", t, pageno, s, c);
			logger.debug("POST data: {}", postData);
			
			// 요청 생성 (개선된 헤더)
			HttpRequest request = HttpRequest.newBuilder()
				.uri(URI.create("https://mabinogimobile.nexon.com/Ranking/List/rankdata"))
				.header("User-Agent", currentUserAgent)
				.header("Accept", "*/*")
				.header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
				.header("Accept-Encoding", "gzip, deflate, br")
				.header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
				.header("Origin", "https://mabinogimobile.nexon.com")
				.header("Referer", "https://mabinogimobile.nexon.com/Ranking/List?t=" + t)
				.header("X-Requested-With", "XMLHttpRequest")
				.header("Sec-Fetch-Dest", "empty")
				.header("Sec-Fetch-Mode", "cors")
				.header("Sec-Fetch-Site", "same-origin")
				.timeout(Duration.ofSeconds(30))
				.POST(HttpRequest.BodyPublishers.ofString(postData))
				.build();
			
			// 요청 전송 및 처리
			String responseBody = sendRequestWithAdaptiveRateLimit(request);
			processResponse(responseBody, s, c);
			
			// 성공 시 에러 카운트 리셋
			consecutiveErrors = 0;
			logger.info("✓ Rank collection completed successfully");
			
		}catch(Exception e){
			consecutiveErrors++;
			logger.error("✗ Error during rank collection (page: {}, class: {}): {} - {}",
				pageno, c, e.getClass().getSimpleName(), e.getMessage());
			
			// 403 에러 처리 (더 적극적으로)
			if(e.getMessage() != null &&
				(e.getMessage().contains("403") || e.getMessage().contains("Forbidden"))){
				logger.warn("403 Forbidden detected - forcing cookie reinitialization");
				cookiesInitialized = false;
				cookieInitializedTime = 0;
				currentUserAgent = null;
				cookieManager.getCookieStore().removeAll();
			}
			
			throw new RuntimeException("Rank collection failed", e);
		}
	}
	
	/**
	 * Rate Limiting 적용 (대기 시간 증가)
	 */
	private String sendRequestWithAdaptiveRateLimit(HttpRequest request) throws Exception{
		rateLimitLock.lock();
		try{
			long currentTime = System.currentTimeMillis();
			long timeSinceLastRequest = currentTime - lastRequestTime;
			
			// 에러가 발생할수록 대기 시간 증가 (더 보수적으로)
			long adaptiveInterval = MIN_REQUEST_INTERVAL + (consecutiveErrors * 8000L);
			
			if(timeSinceLastRequest < adaptiveInterval){
				long waitTime = adaptiveInterval - timeSinceLastRequest;
				logger.debug("Rate limiting: waiting {}ms (consecutive errors: {})",
					waitTime, consecutiveErrors);
				Thread.sleep(waitTime);
			}
			
			lastRequestTime = System.currentTimeMillis();
			return sendRequestWithRetry(request);
			
		}finally{
			rateLimitLock.unlock();
		}
	}
	
	/**
	 * 재시도 로직 (403 처리 개선)
	 */
	private String sendRequestWithRetry(HttpRequest request) throws Exception{
		int attempt = 0;
		Exception lastException = null;
		
		while(attempt < 3){
			try{
				logger.debug("Request attempt {}/3...", attempt + 1);
				
				HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
				
				logger.debug("Attempt {}: Status={}, Size={} bytes",
					attempt + 1, response.statusCode(), response.body().length);
				
				if(response.statusCode() == 200){
					String body = decodeResponse(response);
					
					// 응답 검증 (더 관대하게)
					if(body.contains("<ul class=\"list\">") ||
						body.contains("class=\"item\"") ||
						body.contains("결과가 없습니다") ||
						body.length() > 100){
						logger.debug("✓ Valid response received on attempt {}", attempt + 1);
						return body;
					}else{
						logger.warn("Unexpected response format on attempt {} (length: {})",
							attempt + 1, body.length());
						// 빈 응답도 유효하다고 간주
						if(body.length() > 50){
							return body;
						}
					}
					
				}else if(response.statusCode() == 403){
					logger.warn("403 Forbidden on attempt {}", attempt + 1);
					
					// 첫 번째 시도에서만 쿠키 재초기화
					if(attempt == 0){
						logger.info("Attempting to reinitialize cookies due to 403...");
						cookiesInitialized = false;
						cookieInitializedTime = 0;
						currentUserAgent = null;
						cookieManager.getCookieStore().removeAll();
						
						if(initializeCookies()){
							logger.info("Cookies reinitialized - retrying request");
							Thread.sleep(5000);
							continue; // 재시도하지만 attempt 증가 안함
						}else{
							logger.error("Failed to reinitialize cookies");
						}
					}
					
					// 두 번째 시도부터는 더 긴 대기
					long waitTime = 15000L + (attempt * 10000L);
					logger.warn("Waiting {}ms before next 403 retry...", waitTime);
					Thread.sleep(waitTime);
					
				}else if(response.statusCode() == 429){
					long waitTime = 40000L + (attempt * 20000L);
					logger.warn("429 Rate Limited - waiting {}ms before retry", waitTime);
					Thread.sleep(waitTime);
					
				}else{
					logger.warn("Unexpected HTTP status {} on attempt {}",
						response.statusCode(), attempt + 1);
				}
				
			}catch(java.net.ConnectException e){
				logger.error("Connection error on attempt {}: {} (Docker network issue?)",
					attempt + 1, e.getMessage());
				lastException = e;
				
			}catch(java.net.UnknownHostException e){
				logger.error("DNS resolution error on attempt {}: {} (Check Docker DNS settings)",
					attempt + 1, e.getMessage());
				lastException = e;
				
			}catch(java.net.SocketTimeoutException e){
				logger.error("Timeout on attempt {}: {}", attempt + 1, e.getMessage());
				lastException = e;
				
			}catch(Exception e){
				logger.error("Request error on attempt {}: {} - {}",
					attempt + 1, e.getClass().getSimpleName(), e.getMessage());
				lastException = e;
			}
			
			attempt++;
			if(attempt < 3){
				long backoffTime = 8000L * attempt; // 더 긴 백오프
				logger.debug("Backing off for {}ms before retry...", backoffTime);
				Thread.sleep(backoffTime);
			}
		}
		
		throw new Exception("Max retries (3) reached - last error: " +
			(lastException != null ? lastException.getMessage() : "unknown"), lastException);
	}
	
	/**
	 * GZIP 압축 응답 디코딩
	 */
	private String decodeResponse(HttpResponse<byte[]> response) throws Exception{
		byte[] body = response.body();
		
		// Content-Encoding 헤더 확인
		String encoding = response.headers()
			.firstValue("Content-Encoding")
			.orElse("")
			.toLowerCase();
		
		if(encoding.contains("gzip")){
			logger.debug("Decoding GZIP compressed response");
			try(GZIPInputStream gis = new GZIPInputStream(new ByteArrayInputStream(body))){
				byte[] decompressed = gis.readAllBytes();
				return new String(decompressed, StandardCharsets.UTF_8);
			}
		}else{
			return new String(body, StandardCharsets.UTF_8);
		}
	}
	
	
	/**
	 * HTML 파싱 및 DB 저장
	 */
	@Transactional
	private void processResponse(String responseBody, int serverId, int classId){
		try{
			logger.debug("Processing response HTML (length: {})", responseBody.length());
			
			Document doc = Jsoup.parse(responseBody);
			Elements rankItems = doc.select("ul.list > li.item");
			
			if(rankItems.isEmpty()){
				logger.info("No ranking data found for server={}, class={}", serverId, classId);
				return;
			}
			
			logger.debug("Found {} rank items", rankItems.size());
			List<UserRank> rankList = new ArrayList<>();
			
			for(Element item : rankItems){
				try{
					// 클래스 속성 (예: "mage_2", "warrior_3")
					String classAttr = item.select("dl:has(dt:contains(클래스)) dd").attr("class").trim();
					
					// 캐릭터명
					String userName = item.select("dl:has(dt:contains(캐릭터명)) dd")
						.attr("data-charactername").trim();
					
					// 전투력
					String userPowerStr = item.select("dd.type_1").text().trim();
					
					// 데이터 검증
					if(userName.isEmpty() || userPowerStr.isEmpty() || classAttr.isEmpty()){
						logger.debug("Skipping item with empty data");
						continue;
					}
					
					// 전투력 숫자 변환
					int userPower;
					try{
						userPower = Integer.parseInt(userPowerStr.replace(",", ""));
					}catch(NumberFormatException e){
						logger.debug("Failed to parse power '{}': {}", userPowerStr, e.getMessage());
						continue;
					}
					
					// 클래스 ID 파싱 (트랜잭션 내에서 실행)
					int parsedClassId = parseClassId(classAttr);
					if(parsedClassId == 0){
						logger.debug("Unknown class attribute: {}", classAttr);
						continue;
					}
					
					// UserRank 엔티티 생성
					UserRank userRank = new UserRank();
					userRank.setServerId(serverId);
					userRank.setClassId(parsedClassId);
					userRank.setUserName(userName);
					userRank.setUserPower(userPower);
					
					rankList.add(userRank);
					
					logger.debug("Added rank item: user={}, power={}, server={}, class={}",
						userName, userPower, serverId, parsedClassId);
					
				}catch(Exception e){
					logger.debug("Error processing rank item: {} - {}",
						e.getClass().getSimpleName(), e.getMessage());
				}
			}
			
			logger.info("Prepared {} rank items for saving (server: {}, class: {})",
				rankList.size(), serverId, classId);
			
			if(!rankList.isEmpty()){
				userRankRepository.saveAll(rankList);
				
				logger.info("✓ Saved {} user ranks to database (server: {}, class: {})",
					rankList.size(), serverId, classId);
			}else{
				logger.warn("No valid rank data to save for server={}, class={}",
					serverId, classId);
			}
			
		}catch(Exception e){
			logger.error("Error processing response data: {} - {}",
				e.getClass().getSimpleName(), e.getMessage(), e);
		}
	}
	
	
	/**
	 * 클래스 속성을 클래스 ID로 변환 (캐시 사용)
	 */
	private int parseClassId(String classAttr){
		// 캐시에서 먼저 확인
		if(classCodeCache.containsKey(classAttr)){
			return classCodeCache.get(classAttr);
		}
		
		try{
			GameClass gameClass = gameClassRepository.findByClassCode(classAttr);
			if(gameClass != null){
				int classId = gameClass.getClassId().intValue();
				// 캐시에 저장
				classCodeCache.put(classAttr, classId);
				return classId;
			}else{
				logger.debug("Class not found in database: {}", classAttr);
				// 0을 캐시하여 반복 조회 방지
				classCodeCache.put(classAttr, 0);
			}
		}catch(Exception e){
			logger.debug("Error parsing classId for '{}': {}", classAttr, e.getMessage());
		}
		return 0;
	}
	
	/**
	 * Linux 환경용 User Agent 랜덤 선택
	 */
	private String getRandomUserAgent(){
		return USER_AGENTS[(int) (Math.random() * USER_AGENTS.length)];
	}
	
	/**
	 * 쿠키 강제 재초기화 (외부 호출용)
	 */
	public void resetCookies(){
		cookiesInitialized = false;
		cookieInitializedTime = 0;
		consecutiveErrors = 0;
		currentUserAgent = null;
		cookieManager.getCookieStore().removeAll();
		logger.info("✓ Cookies forcibly reset");
	}
	
	/**
	 * 서비스 상태 확인 (헬스체크용)
	 */
	public boolean isHealthy(){
		return cookiesInitialized && consecutiveErrors < 3;
	}
}