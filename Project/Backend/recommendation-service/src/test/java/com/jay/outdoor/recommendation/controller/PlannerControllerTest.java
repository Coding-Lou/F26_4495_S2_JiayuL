package com.jay.outdoor.recommendation.controller;

import com.jay.outdoor.recommendation.config.SecurityConfig;
import com.jay.outdoor.recommendation.dto.PlannerStatus;
import com.jay.outdoor.recommendation.dto.PlannerTurnRequest;
import com.jay.outdoor.recommendation.dto.PlannerTurnResponse;
import com.jay.outdoor.recommendation.dto.PlanningContext;
import com.jay.outdoor.recommendation.dto.SceneryType;
import com.jay.outdoor.recommendation.dto.TrailDifficulty;
import com.jay.outdoor.recommendation.service.ConversationPlannerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(SecurityConfig.class)
@WebMvcTest(PlannerController.class)
class PlannerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean
    private ConversationPlannerService plannerService;

    @Test
    void shouldReturnPlannerTurnResponse() throws Exception {
        PlanningContext context = new PlanningContext(
                TrailDifficulty.MODERATE,
                null,
                null,
                180,
                List.of(SceneryType.LAKE)
        );

        when(plannerService.handleTurn(
                any(PlannerTurnRequest.class),
                eq("test-token")
        )).thenReturn(new PlannerTurnResponse(
                PlannerStatus.READY_TO_RECOMMEND,
                "I found trails that fit what you're looking for.",
                context,
                List.of()
        ));

        mockMvc.perform(
                        post("/api/planner/turn")
                                .with(jwt().jwt(jwt ->
                                        jwt.tokenValue("test-token")
                                ))
                                .contentType("application/json")
                                .content("""
                                    {
                                      "message": "Around three hours.",
                                      "context": {
                                        "difficulty": "MODERATE",
                                        "maxDistanceKm": null,
                                        "maxElevationGainM": null,
                                        "maxDurationMin": null,
                                        "preferredScenery": ["LAKE"]
                                      },
                                      "latitude": 49.2827,
                                      "longitude": -123.1207,
                                      "tripDate": "2026-10-17"
                                    }
                                    """)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("READY_TO_RECOMMEND"))
                .andExpect(jsonPath("$.context.difficulty")
                        .value("MODERATE"))
                .andExpect(jsonPath("$.context.maxDurationMin")
                        .value(180))
                .andExpect(jsonPath("$.context.preferredScenery[0]")
                        .value("LAKE"))
                .andExpect(jsonPath("$.recommendations").isArray());
    }

    @Test
    void shouldRejectInvalidPlannerRequest() throws Exception {
        mockMvc.perform(
                        post("/api/planner/turn")
                                .with(jwt().jwt(jwt ->
                                        jwt.tokenValue("test-token")
                                ))
                                .contentType("application/json")
                                .content("""
                                    {
                                      "message": " ",
                                      "latitude": 100,
                                      "longitude": -123.1207,
                                      "tripDate": null,
                                      "radiusKm": 0
                                    }
                                    """)
                )
                .andExpect(status().isBadRequest());

        verifyNoInteractions(plannerService);
    }

    @Test
    void shouldRequireAuthentication() throws Exception {
        mockMvc.perform(
                        post("/api/planner/turn")
                                .contentType("application/json")
                                .content("""
                                    {
                                      "message": "I want an easy lake hike.",
                                      "latitude": 49.2827,
                                      "longitude": -123.1207,
                                      "tripDate": "2026-10-17"
                                    }
                                    """)
                )
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(plannerService);
    }
}
