package com.example.mobinogi;

import com.example.mobinogi.service.rank.RankCollectService;
import com.example.mobinogi.service.util.GoogleSheetsService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.PropertySource;
import org.springframework.context.annotation.PropertySources;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@PropertySources({
	@PropertySource("classpath:properties/env.properties") // env.properties 파일 소스 등록
})
public class MobinogiApplication implements CommandLineRunner{
	
	private final GoogleSheetsService sheetsService;
	private final RankCollectService rankCollectService;
	
	public MobinogiApplication(GoogleSheetsService sheetsService, RankCollectService rankCollectService){
		this.sheetsService = sheetsService;
		this.rankCollectService = rankCollectService;
	}
	
	public static void main(String[] args){
		SpringApplication.run(MobinogiApplication.class, args);
	}
	
	@Override
	public void run(String... args) throws Exception{
	}
}
