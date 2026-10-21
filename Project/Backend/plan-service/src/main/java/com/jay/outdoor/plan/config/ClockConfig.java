package com.jay.outdoor.plan.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class ClockConfig {

    /** Server-local clock: the tripDate rule (spec section 15) uses it. */
    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
