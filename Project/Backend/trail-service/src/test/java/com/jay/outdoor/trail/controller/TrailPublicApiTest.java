package com.jay.outdoor.trail.controller;

import com.jay.outdoor.trail.config.SecurityConfig;
import com.jay.outdoor.trail.dto.ActivitySource;
import com.jay.outdoor.trail.dto.NearbyTrailResponse;
import com.jay.outdoor.trail.dto.TrailActivityItemResponse;
import com.jay.outdoor.trail.dto.TrailActivityResponse;
import com.jay.outdoor.trail.dto.TrailDetailResponse;
import com.jay.outdoor.trail.dto.TrailSummaryResponse;
import com.jay.outdoor.trail.service.TrailActivityService;
import com.jay.outdoor.trail.service.TrailService;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.Filter;
import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.aMapWithSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TrailController.class)
@Import(SecurityConfig.class)
class TrailPublicApiTest {

    private static final UUID TRAIL_ID = UUID.fromString(
            "11111111-1111-1111-1111-111111111111");
    private static final LocalDate DATE = LocalDate.of(2026, 10, 14);

    @Autowired MockMvc mvc;
    @Autowired @Qualifier("springSecurityFilterChain") Filter springSecurityFilterChain;
    @MockitoBean TrailService trailService;
    @MockitoBean TrailActivityService activityService;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test
    void publicListAndDetailAllowNoTokenAndStillAllowAuthenticatedReads() throws Exception {
        when(trailService.searchTrails(isNull(), isNull(), isNull(), isNull()))
                .thenReturn(List.of());
        when(trailService.getTrailDetail(TRAIL_ID)).thenReturn(Optional.of(detail()));

        mvc.perform(get("/api/trails")).andExpect(status().isOk());
        mvc.perform(get("/api/trails/{id}", TRAIL_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(TRAIL_ID.toString()));

        when(jwtDecoder.decode("valid")).thenReturn(Jwt.withTokenValue("valid")
                .header("alg", "none")
                .subject("test-user")
                .issuedAt(Instant.parse("2026-10-14T00:00:00Z"))
                .expiresAt(Instant.parse("2026-10-15T00:00:00Z"))
                .build());
        mvc.perform(get("/api/trails").header("Authorization", "Bearer valid"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/trails/{id}", TRAIL_ID)
                        .header("Authorization", "Bearer valid"))
                .andExpect(status().isOk());
    }

    @Test
    void activityLiteralRouteIsPublicAndReturnsOnlyItsContractFields() throws Exception {
        when(activityService.getActivity(DATE)).thenReturn(new TrailActivityResponse(
                DATE, ActivitySource.SIMULATED,
                List.of(new TrailActivityItemResponse(TRAIL_ID, 0))));

        mvc.perform(get("/api/trails/activity").param("date", DATE.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", aMapWithSize(3)))
                .andExpect(jsonPath("$.date").value(DATE.toString()))
                .andExpect(jsonPath("$.source").value("SIMULATED"))
                .andExpect(jsonPath("$.trails[0]", aMapWithSize(2)))
                .andExpect(jsonPath("$.trails[0].trailId").value(TRAIL_ID.toString()))
                .andExpect(jsonPath("$.trails[0].activityCount").value(0));

        verify(activityService).getActivity(DATE);
        verifyNoInteractions(trailService);
    }

    @Test
    void publicNearbyAllowsNoTokenAndReturnsTheServiceBody() throws Exception {
        when(trailService.getNearbyTrails(49.2827, -123.1207, 10.0))
                .thenReturn(List.of(new NearbyTrailResponse(summary(), 1.5)));

        mvc.perform(get("/api/trails/nearby")
                        .param("lat", "49.2827").param("lon", "-123.1207")
                        .param("radiusKm", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].trail.id").value(TRAIL_ID.toString()))
                .andExpect(jsonPath("$[0].distanceFromUserKm").value(1.5));

        verify(trailService).getNearbyTrails(49.2827, -123.1207, 10.0);
    }

    @Test
    void nearbyRadiusIsBoundedAtOneHundredFiftyKilometres() throws Exception {
        when(trailService.getNearbyTrails(49.2827, -123.1207, 150.0))
                .thenReturn(List.of());

        mvc.perform(get("/api/trails/nearby")
                        .param("lat", "49.2827").param("lon", "-123.1207")
                        .param("radiusKm", "150"))
                .andExpect(status().isOk());
        verify(trailService).getNearbyTrails(49.2827, -123.1207, 150.0);
    }

    @Test
    void nearbyRadiusOutsideTheBoundIsABadRequest() throws Exception {
        for (String radiusKm : List.of("150.1", "0", "-1")) {
            mvc.perform(get("/api/trails/nearby")
                            .param("lat", "49.2827").param("lon", "-123.1207")
                            .param("radiusKm", radiusKm))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(trailService);
    }

    @Test
    void otherParameterConstraintsAreBadRequests() throws Exception {
        mvc.perform(get("/api/trails/nearby")
                        .param("lat", "100").param("lon", "-123.1207")
                        .param("radiusKm", "10"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/trails").param("maxDistanceKm", "-1"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(trailService);
    }

    @Test
    void invalidBearerTokenOnNearbyStillReturnsUnauthorized() throws Exception {
        when(jwtDecoder.decode("invalid"))
                .thenThrow(new BadJwtException("Invalid token"));
        mvc.perform(get("/api/trails/nearby")
                        .param("lat", "49.2827").param("lon", "-123.1207")
                        .param("radiusKm", "10")
                        .header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(trailService);
    }

    @Test
    void unrelatedMethodsAndPathsStayProtected() throws Exception {
        mvc.perform(post("/api/trails/nearby")
                        .param("lat", "49.2827").param("lon", "-123.1207")
                        .param("radiusKm", "10"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/trails"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/trails/internal"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/trails/activity"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidBearerTokenOnPublicReadStillReturnsUnauthorized() throws Exception {
        when(jwtDecoder.decode("invalid"))
                .thenThrow(new BadJwtException("Invalid token"));
        mvc.perform(get("/api/trails").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void missingAndMalformedActivityDatesAreBadRequests() throws Exception {
        mvc.perform(get("/api/trails/activity"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/trails/activity").param("date", "not-a-date"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void outOfRangeActivityDatesAreBadRequests() throws Exception {
        for (LocalDate date : List.of(DATE.minusDays(2), DATE.plusDays(2))) {
            when(activityService.getActivity(date)).thenThrow(
                    new ResponseStatusException(HttpStatus.BAD_REQUEST, "date out of range"));
            mvc.perform(get("/api/trails/activity").param("date", date.toString()))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void publicDetailToleratesAQueryString() throws Exception {
        when(trailService.getTrailDetail(TRAIL_ID)).thenReturn(Optional.of(detail()));

        mvc.perform(get("/api/trails/" + TRAIL_ID + "?v=1"))
                .andExpect(status().isOk());
    }

    @Test
    void anonymousErrorDispatchKeepsTheOriginalStatus() throws Exception {
        // A real container turns sendError(400) into an ERROR dispatch to /error,
        // and the security chain runs again for it. MockMvc neither forwards nor
        // runs its filters for a simulated ERROR dispatch, so the chain is invoked
        // directly: an anonymous caller must keep the 400, not receive a 401.
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/error");
        request.setDispatcherType(DispatcherType.ERROR);
        request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 400);
        request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, "/api/trails/activity");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(400);
        MockFilterChain errorPage = new MockFilterChain();

        springSecurityFilterChain.doFilter(request, response, errorPage);

        assertNotNull(errorPage.getRequest(), "error page was not reached");
        assertEquals(400, response.getStatus());
    }

    @Test
    void directRequestToErrorPathStaysProtected() throws Exception {
        mvc.perform(get("/error")).andExpect(status().isUnauthorized());
    }

    private TrailSummaryResponse summary() {
        return new TrailSummaryResponse(TRAIL_ID, "Quarry Rock", "Forest trail",
                "MODERATE", 5.8, 220, 120, 49.3, -122.9, "DEMO_SEED",
                Set.of("FOREST"), null, Set.of());
    }

    private TrailDetailResponse detail() {
        return new TrailDetailResponse(TRAIL_ID, "Quarry Rock", "Forest trail",
                "MODERATE", 5.8, 220, 120, 49.3, -122.9, null,
                "DEMO_SEED", null, Set.of("FOREST"), Set.of());
    }
}
