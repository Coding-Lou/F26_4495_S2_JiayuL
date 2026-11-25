package com.jay.outdoor.activity.support;

import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;

public final class TestRedis {

    public static final GenericContainer<?> INSTANCE =
            new GenericContainer<>(DockerImageName.parse("redis:7"))
                    .withExposedPorts(6379);

    static {
        INSTANCE.start();
    }

    private TestRedis() {
    }
}
