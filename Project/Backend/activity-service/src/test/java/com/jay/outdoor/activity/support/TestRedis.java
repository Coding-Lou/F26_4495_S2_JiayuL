package com.jay.outdoor.activity.support;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

public final class TestRedis {

    @ServiceConnection(name = "redis")
    public static final GenericContainer<?> INSTANCE =
            new GenericContainer<>(DockerImageName.parse("redis:7"))
                    .withExposedPorts(6379);

    static {
        INSTANCE.start();
    }

    private TestRedis() {
    }
}