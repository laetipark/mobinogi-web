package com.example.mobinogi.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis connection/template configuration.
 */
@Configuration
public class RedisConfig{

	/** Redis host. */
	@Value("${redis.host}")
	/**
	 * Field redisHost.
	 */
	private String redisHost;

	/** Redis port. */
	@Value("${redis.port}")
	/**
	 * Field redisPort.
	 */
	private int redisPort;

	/** Redis password (optional). */
	@Value("${redis.password:}")
	/**
	 * Field redisPassword.
	 */
	private String redisPassword;

	/** Redis database index. */
	@Value("${redis.database}")
	/**
	 * Field redisDatabase.
	 */
	private int redisDatabase;

	/**
	 * Builds Redis connection factory.
	 *
	 * @return redis connection factory
	 */
	@Bean
	public RedisConnectionFactory redisConnectionFactory(){
		RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
		config.setHostName(redisHost);
		config.setPort(redisPort);
		config.setDatabase(redisDatabase);

		if(redisPassword != null && !redisPassword.isEmpty()){
			config.setPassword(redisPassword);
		}

		LettuceConnectionFactory factory = new LettuceConnectionFactory(config);
		factory.setValidateConnection(false);
		factory.setShareNativeConnection(false);
		return factory;
	}

	/**
	 * Builds object RedisTemplate using JSON value serializer.
	 *
	 * @param connectionFactory redis connection factory
	 * @return configured redis template
	 */
	@Bean
	public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory){
		RedisTemplate<String, Object> template = new RedisTemplate<>();
		template.setConnectionFactory(connectionFactory);

		// Use plain string keys for readability.
		template.setKeySerializer(new StringRedisSerializer());
		template.setHashKeySerializer(new StringRedisSerializer());

		// Use JSON serializer with Java-time support.
		ObjectMapper mapper = new ObjectMapper();
		mapper.registerModule(new JavaTimeModule());
		mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

		GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(mapper);

		template.setValueSerializer(serializer);
		template.setHashValueSerializer(serializer);

		template.afterPropertiesSet();
		return template;
	}
}
