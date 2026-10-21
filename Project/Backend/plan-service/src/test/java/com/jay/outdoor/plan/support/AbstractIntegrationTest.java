package com.jay.outdoor.plan.support;

import com.jay.outdoor.plan.client.TrailCatalogClient;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * MockMvc against a real PostgreSQL (Testcontainers), with a mocked JwtDecoder
 * and a mocked trail client. Users are {@code user-a} and {@code user-b}.
 */
@SpringBootTest
@AutoConfigureMockMvc
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

    @MockitoBean
    protected JwtDecoder jwtDecoder;

    @MockitoBean
    protected TrailCatalogClient trailCatalogClient;

    @BeforeEach
    void resetState() {
        jdbc.update("DELETE FROM plans");
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

    protected static String planJson(UUID trailId, LocalDate tripDate) {
        return "{\"trailId\":\"" + trailId + "\",\"tripDate\":\"" + tripDate + "\"}";
    }

    protected ResultActions postPlan(RequestPostProcessor user, String body) throws Exception {
        return mockMvc.perform(post("/api/plans")
                .with(user)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    protected UUID createPlan(String subject, UUID trailId, LocalDate tripDate) throws Exception {
        MvcResult result = postPlan(as(subject), planJson(trailId, tripDate))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(json(result).get("id").asString());
    }

    protected int countPlans() {
        return jdbc.queryForObject("SELECT count(*) FROM plans", Integer.class);
    }

    protected int countActivePlans() {
        return jdbc.queryForObject("SELECT count(*) FROM plans WHERE deleted = FALSE", Integer.class);
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
