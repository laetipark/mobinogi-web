package com.example.mobinogi;

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
public class MobinogiApplication{
	
	public static void main(String[] args){
		SpringApplication.run(MobinogiApplication.class, args);
	}
}
