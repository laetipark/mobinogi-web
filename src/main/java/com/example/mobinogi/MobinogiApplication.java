package com.example.mobinogi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MobinogiApplication{

	/**
	 * Application entry point.
	 *
	 * @param args CLI args
	 */
	public static void main(String[] args){
		SpringApplication.run(MobinogiApplication.class, args);
	}
}
