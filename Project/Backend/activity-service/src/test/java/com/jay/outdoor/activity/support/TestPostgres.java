package com.jay.outdoor.activity.support;

import org.testcontainers.postgresql.PostgreSQLContainer;

/** One PostgreSQL container shared by this module's Spring integration tests. */
public final class TestPostgres {

    public static final PostgreSQLContainer INSTANCE =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("activity_db")
                    .withUsername("test_user")
                    .withPassword("test_password");

    static {
        INSTANCE.start();
    }

    private TestPostgres() {
    }
}
