package com.jay.outdoor.memory.integration;

import com.jay.outdoor.memory.client.TrailCatalogClient;
import com.jay.outdoor.memory.storage.LocalMemoryPhotoStorage;
import com.jay.outdoor.memory.storage.SignedPhotoUrl;
import com.jay.outdoor.memory.support.Fixtures;
import com.jay.outdoor.memory.support.TestPostgres;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Local storage mode end to end: signed URLs served by memory-service (AC-20, AC-36). */
@SpringBootTest(properties = {
        "memory.storage.type=local",
        "memory.storage.local.signing-secret=integration-test-secret"
})
@AutoConfigureMockMvc
class LocalPhotoEndpointIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer postgres = TestPostgres.INSTANCE;

    private static final Path ROOT = createRoot();
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String SECRET = "integration-test-secret";

    @DynamicPropertySource
    static void storageRoot(DynamicPropertyRegistry registry) {
        registry.add("memory.storage.local.root", ROOT::toString);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private TrailCatalogClient trailCatalogClient;

    private UUID memoryId;
    private UUID photoId;
    private String url;
    private Path file;

    @BeforeEach
    void uploadOnePhoto() throws Exception {
        jdbc.update("DELETE FROM memory_photos");
        jdbc.update("DELETE FROM memories");
        when(trailCatalogClient.trailExists(any())).thenReturn(true);

        MvcResult created = mockMvc.perform(post("/api/memories")
                        .with(jwt().jwt(t -> t.subject("user-a")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"trailId\":\"" + UUID.randomUUID() + "\",\"tripDate\":\"2025-08-01\","
                                + "\"title\":\"Local\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        memoryId = UUID.fromString(json(created).get("id").asString());

        JsonNode photo = json(mockMvc.perform(multipart("/api/memories/{id}/photos", memoryId)
                        .file(new MockMultipartFile("file", "x.png", "image/png",
                                Fixtures.read(Fixtures.JPEG_GPS)))
                        .with(jwt().jwt(t -> t.subject("user-a"))))
                .andExpect(status().isCreated())
                .andReturn());
        photoId = UUID.fromString(photo.get("id").asString());
        url = photo.get("url").asString();
        file = ROOT.resolve("memories").resolve(memoryId.toString()).resolve(photoId + ".jpg");
    }

    @Test
    void theStoredFileIsWrittenAtomicallyUnderTheRoot() throws IOException {
        assertTrue(Files.isRegularFile(file));
        try (Stream<Path> siblings = Files.list(file.getParent())) {
            assertEquals(List.of(file), siblings.toList(), "no temporary file is left behind");
        }
    }

    @Test
    void aValidSignedUrlServesTheBytesWithoutAToken() throws Exception {
        assertTrue(url.startsWith("/api/memories/local-photos/" + memoryId + "/" + photoId + ".jpg?expires="),
                url);
        assertTrue(url.contains("&signature="));

        MvcResult result = mockMvc.perform(get(url)).andExpect(status().isOk()).andReturn();

        assertEquals("image/jpeg", result.getResponse().getContentType());
        assertEquals("nosniff", result.getResponse().getHeader("X-Content-Type-Options"));
        String cacheControl = result.getResponse().getHeader(HttpHeaders.CACHE_CONTROL);
        assertTrue(cacheControl.matches("private, max-age=(8\\d\\d|900)"), cacheControl);
        assertArrayEquals(Files.readAllBytes(file), result.getResponse().getContentAsByteArray());
    }

    @Test
    void aTamperedExpiredOrOtherKeySignatureIsNotFound() throws Exception {
        String signature = url.substring(url.indexOf("&signature=") + "&signature=".length());
        String expires = url.substring(url.indexOf("expires=") + "expires=".length(), url.indexOf('&'));
        String path = url.substring(0, url.indexOf('?'));

        String flipped = (signature.charAt(0) == 'A' ? "B" : "A") + signature.substring(1);
        assertNotFound(path + "?expires=" + expires + "&signature=" + flipped);
        assertNotFound(path + "?expires=" + (Long.parseLong(expires) + 60) + "&signature=" + signature);
        assertNotFound(path + "?expires=" + expires);
        assertNotFound(path);
        assertNotFound(path + "?expires=abc&signature=" + signature);
        assertNotFound(path + "?expires=" + expires + "&signature=%%%");

        // The same signature presented for a different key.
        String otherKeyPath = "/api/memories/local-photos/" + memoryId + "/" + UUID.randomUUID() + ".jpg";
        assertNotFound(otherKeyPath + "?expires=" + expires + "&signature=" + signature);
        assertNotFound(path.replace(".jpg", ".png") + "?expires=" + expires + "&signature=" + signature);

        // A correctly signed URL whose expiry has passed.
        LocalMemoryPhotoStorage past = new LocalMemoryPhotoStorage(ROOT, SECRET, "",
                Clock.fixed(Instant.now().minus(Duration.ofHours(1)), ZoneOffset.UTC));
        SignedPhotoUrl expired = past.presentationUrl(
                "memories/" + memoryId + "/" + photoId + ".jpg", "image/jpeg", Duration.ofMinutes(15));
        assertNotFound(expired.url());

        // A correctly signed URL for a key with no file.
        LocalMemoryPhotoStorage same = new LocalMemoryPhotoStorage(ROOT, SECRET, "", Clock.systemUTC());
        SignedPhotoUrl missing = same.presentationUrl(
                "memories/" + memoryId + "/" + UUID.randomUUID() + ".jpg", "image/jpeg", Duration.ofMinutes(15));
        assertNotFound(missing.url());

        // Sanity: the untouched URL still works.
        mockMvc.perform(get(url)).andExpect(status().isOk());
    }

    private void assertNotFound(String target) throws Exception {
        MvcResult result = mockMvc.perform(get(target)).andReturn();
        assertEquals(404, result.getResponse().getStatus(), target);
        assertEquals("PHOTO_NOT_FOUND", json(result).get("code").asString());
    }

    private static JsonNode json(MvcResult result) throws Exception {
        return JSON.readTree(result.getResponse().getContentAsString());
    }

    @AfterAll
    static void removeRoot() throws IOException {
        try (Stream<Path> paths = Files.walk(ROOT)) {
            for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        }
    }

    private static Path createRoot() {
        try {
            Path root = Files.createTempDirectory("memory-local-storage-");
            return root;
        } catch (IOException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
