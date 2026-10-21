package com.jay.outdoor.memory.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Builds the RestClient used for trail validation. Spring Boot 4's modular
 * auto-configuration is not relied on for this (as in recommendation-service).
 */
@Configuration
public class TrailClientConfig {

    public static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(2);
    public static final Duration READ_TIMEOUT = Duration.ofSeconds(3);

    @Bean
    public RestClient.Builder trailRestClientBuilder() {
        SimpleClientHttpRequestFactory requestFactory =
                new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);

        return RestClient.builder().requestFactory(requestFactory);
    }
}
