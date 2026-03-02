package com.example.mobinogi;

import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

public class ServletInitializer extends SpringBootServletInitializer{

	/**
	 * Configures application source for WAR deployment.
	 *
	 * @param application builder
	 * @return configured builder
	 */
	@Override
	protected SpringApplicationBuilder configure(SpringApplicationBuilder application){
		return application.sources(MobinogiApplication.class);
	}
}
