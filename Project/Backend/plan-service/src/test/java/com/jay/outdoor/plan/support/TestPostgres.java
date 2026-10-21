package com.jay.outdoor.plan.support;

import org.testcontainers.postgresql.PostgreSQLContainer;

/** One PostgreSQL container shared by every Spring test context of the module. */
public final class TestPostgres {

    public static final PostgreSQLContainer INSTANCE =
            new PostgreSQLContainer("postgres:17-alpine")
                    .withDatabaseName("plan_db")
                    .withUsername("test_user")
                    .withPassword("test_password");

    static {
        INSTANCE.start();
    }

    private TestPostgres() {
    }
}
