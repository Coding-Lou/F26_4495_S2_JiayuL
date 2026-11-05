package com.jay.outdoor.activity.support;

import com.jay.outdoor.activity.client.TrailCatalogClient;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@SpringBootTest
@AutoConfigureMockMvc
public abstract class AbstractIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer postgres = TestPostgres.INSTANCE;

    @MockitoBean
    protected JwtDecoder jwtDecoder;

    @MockitoBean
    protected TrailCatalogClient trailCatalogClient;

    @BeforeEach
    void availableTrail() {
        when(trailCatalogClient.trailExists(any(UUID.class))).thenReturn(true);
    }
}
