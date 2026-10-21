package com.jay.outdoor.memory.config;

import com.jay.outdoor.memory.storage.LocalMemoryPhotoStorage;
import com.jay.outdoor.memory.storage.S3MemoryPhotoStorage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;
import java.time.Clock;

/**
 * Selects the photo storage by {@code memory.storage.type}: {@code local}
 * (the default, development only) or {@code s3} (production).
 */
@Configuration
public class StorageConfig {

    @Bean
    @ConditionalOnProperty(
            name = "memory.storage.type",
            havingValue = "local",
            matchIfMissing = true
    )
    public LocalMemoryPhotoStorage localMemoryPhotoStorage(
            @Value("${memory.storage.local.root:./.local-storage}") String root,
            @Value("${memory.storage.local.signing-secret:}") String signingSecret,
            @Value("${memory.storage.local.public-base-url:}") String publicBaseUrl,
            Clock clock
    ) {
        return new LocalMemoryPhotoStorage(
                Path.of(root),
                signingSecret,
                publicBaseUrl,
                clock
        );
    }

    @Bean
    @ConditionalOnProperty(name = "memory.storage.type", havingValue = "s3")
    public S3MemoryPhotoStorage s3MemoryPhotoStorage(
            @Value("${memory.storage.s3.bucket:}") String bucket,
            @Value("${memory.storage.s3.region:}") String region
    ) {
        return S3MemoryPhotoStorage.create(bucket, region);
    }
}
