package com.jay.outdoor.memory.support;

import com.jay.outdoor.memory.client.TrailCatalogClient;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDate;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * MockMvc against a real PostgreSQL (Testcontainers), with a mocked JwtDecoder,
 * a mocked trail client, and the in-memory photo storage. Users are
 * {@code user-a} and {@code user-b}.
 */
@SpringBootTest(properties = "memory.storage.type=in-memory")
@AutoConfigureMockMvc
@Import(InMemoryStorageTestConfig.class)
public abstract class AbstractIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer postgres = TestPostgres.INSTANCE;

    protected static final JsonMapper JSON = JsonMapper.builder().build();

    protected static final UUID TRAIL = UUID.fromString("11111111-1111-1111-1111-111111111111");
    protected static final UUID OTHER_TRAIL = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected JdbcTemplate jdbc;

    @Autowired
    protected InMemoryMemoryPhotoStorage storage;

    @MockitoBean
    protected JwtDecoder jwtDecoder;

    @MockitoBean
    protected TrailCatalogClient trailCatalogClient;

    @BeforeEach
    void resetState() {
        jdbc.update("DELETE FROM memory_photos");
        jdbc.update("DELETE FROM memories");
        storage.reset();
        when(trailCatalogClient.trailExists(any())).thenReturn(true);
    }

    protected static RequestPostProcessor as(String subject) {
        return jwt().jwt(token -> token.subject(subject));
    }

    protected static RequestPostProcessor userA() {
        return as("user-a");
    }

    protected static RequestPostProcessor userB() {
        return as("user-b");
    }

    protected static LocalDate today() {
        return LocalDate.now();
    }

    protected static String memoryJson(
            UUID trailId,
            LocalDate tripDate,
            String title,
            String story,
            String visibility
    ) {
        StringBuilder json = new StringBuilder("{");
        json.append("\"trailId\":\"").append(trailId).append('"');
        json.append(",\"tripDate\":\"").append(tripDate).append('"');
        json.append(",\"title\":").append(JSON.writeValueAsString(title));
        if (story != null) {
            json.append(",\"story\":").append(JSON.writeValueAsString(story));
        }
        if (visibility != null) {
            json.append(",\"visibility\":\"").append(visibility).append('"');
        }
        return json.append('}').toString();
    }

    protected static String updateJson(
            LocalDate tripDate,
            String title,
            String story,
            String visibility
    ) {
        StringBuilder json = new StringBuilder("{");
        json.append("\"tripDate\":\"").append(tripDate).append('"');
        json.append(",\"title\":").append(JSON.writeValueAsString(title));
        if (story != null) {
            json.append(",\"story\":").append(JSON.writeValueAsString(story));
        }
        if (visibility != null) {
            json.append(",\"visibility\":\"").append(visibility).append('"');
        }
        return json.append('}').toString();
    }

    protected UUID createMemory(String subject, String body) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/memories")
                        .with(as(subject))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(json(result).get("id").asString());
    }

    protected UUID createMemory(
            String subject,
            UUID trailId,
            LocalDate tripDate,
            String title,
            String visibility
    ) throws Exception {
        return createMemory(subject, memoryJson(trailId, tripDate, title, null, visibility));
    }

    protected ResultActions uploadPhoto(String subject, UUID memoryId, byte[] bytes) throws Exception {
        return mockMvc.perform(multipart("/api/memories/{id}/photos", memoryId)
                .file(new MockMultipartFile("file", "IMG_0001.HEIC", "image/heic", bytes))
                .with(as(subject)));
    }

    protected UUID addPhoto(String subject, UUID memoryId, byte[] bytes) throws Exception {
        MvcResult result = uploadPhoto(subject, memoryId, bytes)
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(json(result).get("id").asString());
    }

    protected UUID addPhoto(UUID memoryId) throws Exception {
        return addPhoto("user-a", memoryId, Fixtures.jpeg(8, 6));
    }

    protected ResultActions setVisibility(String subject, UUID memoryId, String visibility)
            throws Exception {
        JsonNode current = json(mockMvc.perform(get("/api/memories/{id}", memoryId).with(as(subject)))
                .andExpect(status().isOk())
                .andReturn());
        String story = current.get("story").isNull() ? null : current.get("story").asString();
        return mockMvc.perform(put("/api/memories/{id}", memoryId)
                .with(as(subject))
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateJson(
                        LocalDate.parse(current.get("tripDate").asString()),
                        current.get("title").asString(),
                        story,
                        visibility)));
    }

    protected static JsonNode json(MvcResult result) throws Exception {
        return JSON.readTree(result.getResponse().getContentAsString());
    }

    protected static Set<String> fieldNames(JsonNode node) {
        return new TreeSet<>(node.propertyNames());
    }

    /** A ProblemDetail body without {@code instance}, for "identical answer" comparisons. */
    protected static JsonNode withoutInstance(MvcResult result) throws Exception {
        var node = (tools.jackson.databind.node.ObjectNode) json(result);
        node.remove("instance");
        return node;
    }
}
