package com.jay.outdoor.memory.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/** Used with {@code memory.storage.type=in-memory}, which matches neither real adapter. */
@TestConfiguration(proxyBeanMethods = false)
public class InMemoryStorageTestConfig {

    @Bean
    public InMemoryMemoryPhotoStorage inMemoryMemoryPhotoStorage() {
        return new InMemoryMemoryPhotoStorage();
    }
}
