package com.jay.outdoor.plan.integration;

import com.jay.outdoor.plan.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/** No Plan path is public: missing, invalid, or subject-less tokens are 401 (AC-03). */
class PlanSecurityIntegrationTest extends AbstractIntegrationTest {

    private UUID planId;
    private List<Supplier<AbstractMockHttpServletRequestBuilder<?>>> endpoints;

    @BeforeEach
    void setUp() throws Exception {
        when(jwtDecoder.decode(anyString())).thenThrow(new BadJwtException("invalid"));

        planId = createPlan("user-a", TRAIL, today());
        String create = planJson(OTHER_TRAIL, today());

        endpoints = List.of(
                () -> get("/api/plans"),
                () -> get("/api/plans").param("page", "0").param("size", "5"),
                () -> post("/api/plans").contentType(MediaType.APPLICATION_JSON).content(create),
                () -> get("/api/plans/{id}", planId),
                () -> delete("/api/plans/{id}", planId),
                () -> put("/api/plans/{id}", planId).contentType(MediaType.APPLICATION_JSON).content(create),
                () -> patch("/api/plans/{id}", planId).contentType(MediaType.APPLICATION_JSON).content(create),
                () -> get("/api/plans/{id}", "not-a-uuid"),
                () -> get("/api/plans/{id}", UUID.randomUUID()),
                () -> get("/api/plans/unknown/path"),
                () -> get("/error")
        );
    }

    @Test
    void everyEndpointWithoutATokenIsUnauthorized() throws Exception {
        for (Supplier<AbstractMockHttpServletRequestBuilder<?>> endpoint : endpoints) {
            expectUnauthorized(mockMvc.perform(endpoint.get()).andReturn());
        }
        assertNothingChanged();
    }

    @Test
    void everyEndpointWithAnInvalidTokenIsUnauthorized() throws Exception {
        for (Supplier<AbstractMockHttpServletRequestBuilder<?>> endpoint : endpoints) {
            expectUnauthorized(mockMvc.perform(endpoint.get()
                    .header(HttpHeaders.AUTHORIZATION, "Bearer not-a-valid-token")).andReturn());
        }
        assertNothingChanged();
    }

    @Test
    void everyEndpointWithATokenLackingSubjectIsUnauthorized() throws Exception {
        RequestPostProcessor noSubject = jwt().jwt(token -> token.claims(claims -> claims.remove("sub")));
        RequestPostProcessor blankSubject = jwt().jwt(token -> token.subject("   "));

        for (RequestPostProcessor token : List.of(noSubject, blankSubject)) {
            for (Supplier<AbstractMockHttpServletRequestBuilder<?>> endpoint : endpoints) {
                expectUnauthorized(mockMvc.perform(endpoint.get().with(token)).andReturn());
            }
        }
        assertNothingChanged();
    }

    private void assertNothingChanged() {
        assertEquals(1, countPlans());
        assertEquals(false, jdbc.queryForObject(
                "SELECT deleted FROM plans WHERE id = ?", Boolean.class, planId));
        // Only the setUp create reached the trail check.
        verify(trailCatalogClient, never()).trailExists(OTHER_TRAIL);
        verify(trailCatalogClient).trailExists(any());
    }

    private static void expectUnauthorized(MvcResult result) throws Exception {
        String request = result.getRequest().getMethod() + " " + result.getRequest().getRequestURI();
        assertEquals(401, result.getResponse().getStatus(), request);
        assertEquals(MediaType.APPLICATION_PROBLEM_JSON_VALUE, result.getResponse().getContentType(), request);
        assertEquals("AUTHENTICATION_REQUIRED", json(result).get("code").asString(), request);
    }
}
