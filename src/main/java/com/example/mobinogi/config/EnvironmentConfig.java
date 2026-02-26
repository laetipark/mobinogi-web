package com.example.mobinogi.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.context.annotation.PropertySource;
import org.springframework.context.annotation.PropertySources;

@Configuration
@Profile("development")
@PropertySources({
	@PropertySource(value = "file:./.env.development", ignoreResourceNotFound = true),
	@PropertySource(value = "file:./config/.env.development", ignoreResourceNotFound = true),
	@PropertySource(value = "file:../.env.development", ignoreResourceNotFound = true),
	@PropertySource(value = "file:../config/.env.development", ignoreResourceNotFound = true),
	@PropertySource(value = "file:./mobinogi-web/.env.development", ignoreResourceNotFound = true),
	@PropertySource(value = "file:./mobinogi-web/config/.env.development", ignoreResourceNotFound = true),
	@PropertySource(value = "file:../mobinogi-web/.env.development", ignoreResourceNotFound = true),
	@PropertySource(value = "file:../mobinogi-web/config/.env.development", ignoreResourceNotFound = true),
	@PropertySource(value = "file:./.env", ignoreResourceNotFound = true),
	@PropertySource(value = "file:./config/.env", ignoreResourceNotFound = true),
	@PropertySource(value = "file:../.env", ignoreResourceNotFound = true),
	@PropertySource(value = "file:../config/.env", ignoreResourceNotFound = true),
	@PropertySource(value = "file:./mobinogi-web/.env", ignoreResourceNotFound = true),
	@PropertySource(value = "file:./mobinogi-web/config/.env", ignoreResourceNotFound = true),
	@PropertySource(value = "file:../mobinogi-web/.env", ignoreResourceNotFound = true),
	@PropertySource(value = "file:../mobinogi-web/config/.env", ignoreResourceNotFound = true)
})
public class EnvironmentConfig{
}
