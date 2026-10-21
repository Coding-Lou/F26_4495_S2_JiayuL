package com.jay.outdoor.memory.integration;

import com.jay.outdoor.memory.client.TrailCatalogClient;
import com.jay.outdoor.memory.controller.LocalPhotoController;
import com.jay.outdoor.memory.storage.LocalMemoryPhotoStorage;
import com.jay.outdoor.memory.storage.MemoryPhotoStorage;
import com.jay.outdoor.memory.storage.S3MemoryPhotoStorage;
import com.jay.outdoor.memory.support.TestPostgres;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** In s3 mode the local content endpoint does not exist (AC-20). No AWS call is made. */
@SpringBootTest(properties = {
        "memory.storage.type=s3",
        "memory.storage.s3.bucket=test-bucket",
        "memory.storage.s3.region=us-west-2"
})
@AutoConfigureMockMvc
class S3ModeIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer postgres = TestPostgres.INSTANCE;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationContext context;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private TrailCatalogClient trailCatalogClient;

    @Test
    void usesS3StorageAndRegistersNoLocalPhotoEndpoint() throws Exception {
        assertInstanceOf(S3MemoryPhotoStorage.class, context.getBean(MemoryPhotoStorage.class));
        assertEquals(0, context.getBeansOfType(LocalPhotoController.class).size());
        assertEquals(0, context.getBeansOfType(LocalMemoryPhotoStorage.class).size());

        String path = "/api/memories/local-photos/" + UUID.randomUUID() + "/" + UUID.randomUUID()
                + ".jpg?expires=9999999999&signature=abc";

        // Not public in s3 mode, and no handler behind it.
        mockMvc.perform(get(path))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
        mockMvc.perform(get(path).with(jwt().jwt(t -> t.subject("user-a"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
