package com.jay.outdoor.memory.integration;

import com.jay.outdoor.memory.client.TrailCatalogClient;
import com.jay.outdoor.memory.support.InMemoryMemoryPhotoStorage;
import com.jay.outdoor.memory.support.InMemoryStorageTestConfig;
import com.jay.outdoor.memory.support.TestPostgres;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * Real Tomcat: an upload over the 10 MB multipart limit receives the 413 problem,
 * not a connection reset (section 17, max-swallow-size).
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "memory.storage.type=in-memory"
)
@Import(InMemoryStorageTestConfig.class)
class UploadSizeLimitIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer postgres = TestPostgres.INSTANCE;

    private static final String TOKEN = "size-limit-test-token";

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private InMemoryMemoryPhotoStorage storage;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private TrailCatalogClient trailCatalogClient;

    @Test
    void anOversizeMultipartUploadIsPayloadTooLarge() throws Exception {
        when(jwtDecoder.decode(TOKEN)).thenReturn(Jwt.withTokenValue(TOKEN)
                .header("alg", "none")
                .subject("user-a")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .build());

        UUID memoryId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO memories (id, owner_subject, trail_id, trip_date, title)
                VALUES (?, 'user-a', ?, CURRENT_DATE, 'Size limit')""", memoryId, UUID.randomUUID());

        String boundary = "----memory-test-" + UUID.randomUUID();
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        body.write(("--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"file\"; filename=\"big.jpg\"\r\n"
                + "Content-Type: image/jpeg\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
        body.write(new byte[10 * 1024 * 1024 + 512 * 1024]);
        body.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.US_ASCII));

        HttpResponse<String> response = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build()
                .send(HttpRequest.newBuilder(
                                URI.create("http://localhost:" + port + "/api/memories/" + memoryId + "/photos"))
                        .header("Authorization", "Bearer " + TOKEN)
                        .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                        .POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray()))
                        .build(), HttpResponse.BodyHandlers.ofString());

        assertEquals(413, response.statusCode(), response.body());
        assertTrue(response.headers().firstValue("Content-Type").orElse("").contains("problem+json"));
        assertEquals("PAYLOAD_TOO_LARGE",
                JsonMapper.builder().build().readTree(response.body()).get("code").asString());
        assertTrue(storage.puts().isEmpty());

        jdbc.update("DELETE FROM memories WHERE id = ?", memoryId);
    }
}
