package com.example.mobinogi.service.user;

import com.example.mobinogi.service.util.GoogleSheetsService;
import com.google.api.services.sheets.v4.Sheets;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;

@Service
public class UserGuildService{
	
	private static final String RANKING_URL = "https://mabinogimobile.nexon.com/Ranking/List/rankdata";
	private static final String BASE_URL = "https://mabinogimobile.nexon.com";
	private final GoogleSheetsService googleSheetsService;
	private final Sheets sheets;
	
	public UserGuildService(GoogleSheetsService googleSheetsService, Sheets sheets){
		this.googleSheetsService = googleSheetsService;
		this.sheets = sheets;
	}
	
	public List<String> getGuildPlayersByName(String guildName) throws Exception{
		this.fetchGuildMember(guildName);
		return null;
	}
	
	@Transactional
	public void fetchGuildMember(String guildName) throws Exception{
		List<List<Object>> header = googleSheetsService.readSheet("guild!A1:XFD1");
		
		if(!header.isEmpty()){
			List<Object> firstRow = header.getFirst();
			int targetColumnIndex = -1;
			
			for(int i = 0 ; i < firstRow.size() ; i++){
				Object cell = firstRow.get(i);
				if(cell != null && cell.toString().trim().equalsIgnoreCase(guildName.trim())){
					targetColumnIndex = i;
					break;
				}
			}
			
			if(targetColumnIndex == -1){
				System.out.println("Column with guild name '" + guildName + "' not found.");
				return;
			}
			
			String colLetter = getColumnLetter(targetColumnIndex);
			String colRange = "guild!" + colLetter + "2:" + colLetter;
			List<List<Object>> columnData = googleSheetsService.readSheet(colRange);
			
			System.out.println("Data for guild '" + guildName + "' in column " + colLetter + ":");
			
			for(List<Object> row : columnData){
				if(!row.isEmpty()){
					String characterName = row.getFirst().toString();
					System.out.println("Requesting for: " + characterName + " " + fetchRankingData(characterName, 1, 1));
				}
			}
		}
	}
	
	/**
	 * 마비노기 사이트에서 랭킹 데이터 가져오기
	 */
	private String fetchRankingData(String characterName, int type, int server) throws Exception{
		String boundary = "----WebKitFormBoundary" + System.currentTimeMillis();
		
		URL url = new URL(RANKING_URL);
		HttpURLConnection conn = (HttpURLConnection) url.openConnection();
		
		// 헤더 설정
		setupHeaders(conn, boundary);
		
		// Form 데이터 생성
		String formData = buildFormData(characterName, type, server, boundary);
		
		// 요청 전송
		try(OutputStreamWriter writer = new OutputStreamWriter(conn.getOutputStream(), "UTF-8")){
			writer.write(formData);
			writer.flush();
		}
		
		// 응답 받기
		return getResponse(conn);
	}
	
	/**
	 * HTTP 헤더 설정
	 */
	private void setupHeaders(HttpURLConnection conn, String boundary) throws Exception{
		conn.setRequestMethod("POST");
		conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
		conn.setRequestProperty("Accept", "*/*");
		conn.setRequestProperty("User-Agent",
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
		conn.setRequestProperty("Origin", BASE_URL);
		conn.setRequestProperty("Referer", BASE_URL + "/Ranking/List?t=" + 1);
		
		conn.setDoOutput(true);
		conn.setConnectTimeout(10000);
		conn.setReadTimeout(10000);
	}
	
	/**
	 * Form 데이터 생성
	 */
	private String buildFormData(String characterName, int type, int server, String boundary){
		StringBuilder formData = new StringBuilder();
		
		// t 파라미터 (랭킹 타입)
		addFormField(formData, boundary, "t", String.valueOf(type));
		
		// pageno 파라미터
		addFormField(formData, boundary, "pageno", "1");
		
		// s 파라미터 (서버)
		addFormField(formData, boundary, "s", String.valueOf(server));
		
		// c 파라미터
		addFormField(formData, boundary, "c", "0");
		
		// search 파라미터 (캐릭터명)
		addFormField(formData, boundary, "search", characterName);
		
		// 마지막 boundary
		formData.append("--").append(boundary).append("--").append("\r\n");
		
		return formData.toString();
	}
	
	/**
	 * Form 필드 추가 헬퍼
	 */
	private void addFormField(StringBuilder formData, String boundary, String name, String value){
		formData.append("--").append(boundary).append("\r\n");
		formData.append("Content-Disposition: form-data; name=\"").append(name).append("\"").append("\r\n\r\n");
		formData.append(value).append("\r\n");
	}
	
	/**
	 * HTTP 응답 읽기
	 */
	private String getResponse(HttpURLConnection conn) throws IOException{
		int responseCode = conn.getResponseCode();
		
		InputStream inputStream = (responseCode >= 200 && responseCode < 300)
			? conn.getInputStream() : conn.getErrorStream();
		
		// GZIP 압축 해제
		String encoding = conn.getHeaderField("Content-Encoding");
		if("gzip".equalsIgnoreCase(encoding)){
			inputStream = new java.util.zip.GZIPInputStream(inputStream);
		}
		
		try(BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, "UTF-8"))){
			StringBuilder response = new StringBuilder();
			String line;
			while((line = reader.readLine()) != null){
				response.append(line).append("\n");
			}
			return response.toString();
		}
	}
	
	// 열 인덱스를 Excel 열 문자로 변환 (예: 0 -> A, 27 -> AB)
	private String getColumnLetter(int index){
		StringBuilder column = new StringBuilder();
		while(index >= 0){
			column.insert(0, (char) ('A' + (index % 26)));
			index = (index / 26) - 1;
		}
		return column.toString();
	}
}
