package com.example.mobinogi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.PropertySource;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@PropertySource(value = "file:.env", ignoreResourceNotFound = true)
public class MobinogiApplication{
	
	public static void main(String[] args){
		SpringApplication.run(MobinogiApplication.class, args);
	}
}
