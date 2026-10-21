package com.jay.outdoor.memory.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class ClockConfig {

    /** Server-local clock: the tripDate rule and local URL expiry use it. */
    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
