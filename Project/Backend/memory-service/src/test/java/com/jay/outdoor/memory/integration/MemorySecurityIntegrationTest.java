package com.jay.outdoor.memory.integration;

import com.jay.outdoor.memory.support.AbstractIntegrationTest;
import com.jay.outdoor.memory.support.Fixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Every owner endpoint refuses a missing, invalid, or subject-less token with 401 (AC-13). */
class MemorySecurityIntegrationTest extends AbstractIntegrationTest {

    private UUID memoryId;
    private UUID photoId;
    private List<Supplier<AbstractMockHttpServletRequestBuilder<?>>> ownerEndpoints;

    @BeforeEach
    void setUp() throws Exception {
        when(jwtDecoder.decode(anyString())).thenThrow(new BadJwtException("invalid"));

        memoryId = createMemory("user-a", TRAIL, today(), "Secured", "PUBLIC");
        photoId = addPhoto(memoryId);

        String create = memoryJson(TRAIL, today(), "New", null, null);
        String update = updateJson(today(), "Changed", null, "PRIVATE");
        String order = "{\"photoIds\":[\"" + photoId + "\"]}";

        ownerEndpoints = List.of(
                () -> get("/api/memories"),
                () -> post("/api/memories").contentType(MediaType.APPLICATION_JSON).content(create),
                () -> get("/api/memories/{id}", memoryId),
                () -> put("/api/memories/{id}", memoryId)
                        .contentType(MediaType.APPLICATION_JSON).content(update),
                () -> delete("/api/memories/{id}", memoryId),
                () -> multipart("/api/memories/{id}/photos", memoryId)
                        .file(new MockMultipartFile("file", "a.jpg", "image/jpeg", Fixtures.jpeg(4, 4))),
                () -> put("/api/memories/{id}/photos/order", memoryId)
                        .contentType(MediaType.APPLICATION_JSON).content(order),
                () -> delete("/api/memories/{id}/photos/{photoId}", memoryId, photoId)
        );
    }

    @Test
    void ownerEndpointsWithoutATokenAreUnauthorized() throws Exception {
        for (Supplier<AbstractMockHttpServletRequestBuilder<?>> endpoint : ownerEndpoints) {
            expectUnauthorized(mockMvc.perform(endpoint.get()).andReturn());
        }
        assertNothingChanged();
    }

    @Test
    void ownerEndpointsWithAnInvalidTokenAreUnauthorized() throws Exception {
        for (Supplier<AbstractMockHttpServletRequestBuilder<?>> endpoint : ownerEndpoints) {
            expectUnauthorized(mockMvc.perform(endpoint.get()
                    .header(HttpHeaders.AUTHORIZATION, "Bearer not-a-valid-token")).andReturn());
        }
        assertNothingChanged();
    }

    @Test
    void ownerEndpointsWithATokenLackingSubjectAreUnauthorized() throws Exception {
        RequestPostProcessor noSubject = jwt().jwt(token -> token.claims(claims -> claims.remove("sub")));
        RequestPostProcessor blankSubject = jwt().jwt(token -> token.subject("   "));

        for (RequestPostProcessor token : List.of(noSubject, blankSubject)) {
            for (Supplier<AbstractMockHttpServletRequestBuilder<?>> endpoint : ownerEndpoints) {
                expectUnauthorized(mockMvc.perform(endpoint.get().with(token)).andReturn());
            }
        }
        assertNothingChanged();
    }

    @Test
    void publicEndpointsNeedNoTokenButRefuseAnInvalidOne() throws Exception {
        mockMvc.perform(get("/api/memories/public").param("trailId", TRAIL.toString()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/memories/public/{id}", memoryId))
                .andExpect(status().isOk());

        expectUnauthorized(mockMvc.perform(get("/api/memories/public")
                        .param("trailId", TRAIL.toString())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer not-a-valid-token"))
                .andReturn());
        expectUnauthorized(mockMvc.perform(get("/api/memories/public/{id}", memoryId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer not-a-valid-token"))
                .andReturn());
    }

    @Test
    void anonymousPublicCallersReceiveTheRealErrorStatus() throws Exception {
        mockMvc.perform(get("/api/memories/public"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/memories/public/{id}", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    private void assertNothingChanged() {
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM memories", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM memory_photos", Integer.class));
        assertEquals(false, jdbc.queryForObject(
                "SELECT deleted FROM memories WHERE id = ?", Boolean.class, memoryId));
        assertEquals(1, storage.objects().size());
    }

    private static void expectUnauthorized(MvcResult result) throws Exception {
        assertEquals(401, result.getResponse().getStatus(),
                result.getRequest().getMethod() + " " + result.getRequest().getRequestURI());
        assertEquals(MediaType.APPLICATION_PROBLEM_JSON_VALUE, result.getResponse().getContentType());
        assertEquals("AUTHENTICATION_REQUIRED", json(result).get("code").asString());
    }
}
