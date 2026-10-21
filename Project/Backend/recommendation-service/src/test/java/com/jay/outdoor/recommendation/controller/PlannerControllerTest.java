package com.jay.outdoor.recommendation.controller;

import com.jay.outdoor.recommendation.config.SecurityConfig;
import com.jay.outdoor.recommendation.dto.DurationMode;
import com.jay.outdoor.recommendation.dto.PlannerStatus;
import com.jay.outdoor.recommendation.dto.PlannerTurnRequest;
import com.jay.outdoor.recommendation.dto.PlannerTurnResponse;
import com.jay.outdoor.recommendation.dto.PlanningContext;
import com.jay.outdoor.recommendation.dto.PlanningPreference;
import com.jay.outdoor.recommendation.dto.SceneryType;
import com.jay.outdoor.recommendation.dto.TrailDifficulty;
import com.jay.outdoor.recommendation.service.ConversationPlannerService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(SecurityConfig.class)
@WebMvcTest(PlannerController.class)
class PlannerControllerTest {

    private static final String TRIP_DATE =
            LocalDate.now().plusDays(1).toString();

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
                null,
                List.of(SceneryType.LAKE),
                List.of(),
                null
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
                                      "tripDate": "%s"
                                    }
                                    """.formatted(TRIP_DATE))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("READY_TO_RECOMMEND"))
                .andExpect(jsonPath("$.context.difficulty")
                        .value("MODERATE"))
                .andExpect(jsonPath("$.context.maxDurationMin")
                        .value(180))
                .andExpect(jsonPath("$.context.durationMode")
                        .value("MAXIMUM"))
                .andExpect(jsonPath("$.context.preferredScenery[0]")
                        .value("LAKE"))
                .andExpect(jsonPath("$.context.openPreferences").isArray())
                .andExpect(jsonPath("$.context.openPreferences").isEmpty())
                .andExpect(jsonPath("$.context.lastAsked").value(nullValue()))
                .andExpect(jsonPath("$.recommendations").isArray());
    }

    @Test
    void shouldSerialiseAndDeserialiseOpenPreferencesAndLastAsked()
            throws Exception {
        when(plannerService.handleTurn(
                any(PlannerTurnRequest.class),
                eq("test-token")
        )).thenReturn(new PlannerTurnResponse(
                PlannerStatus.NEEDS_CLARIFICATION,
                "Got it — I'll keep the difficulty open. How long would you like to spend hiking, or should I keep that open too?",
                new PlanningContext(
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of(),
                        List.of(PlanningPreference.DIFFICULTY),
                        PlanningPreference.TRIP_LENGTH
                ),
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
                                      "message": "any",
                                      "context": {
                                        "difficulty": null,
                                        "maxDistanceKm": null,
                                        "maxElevationGainM": null,
                                        "maxDurationMin": null,
                                        "preferredScenery": [],
                                        "openPreferences": ["SCENERY", "SCENERY", "TRIP_LENGTH"],
                                        "lastAsked": "DIFFICULTY"
                                      },
                                      "latitude": 49.2827,
                                      "longitude": -123.1207,
                                      "tripDate": "%s"
                                    }
                                    """.formatted(TRIP_DATE))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status")
                        .value("NEEDS_CLARIFICATION"))
                .andExpect(jsonPath("$.context.openPreferences[0]")
                        .value("DIFFICULTY"))
                .andExpect(jsonPath("$.context.openPreferences.length()")
                        .value(1))
                .andExpect(jsonPath("$.context.lastAsked")
                        .value("TRIP_LENGTH"));

        ArgumentCaptor<PlannerTurnRequest> captor =
                ArgumentCaptor.forClass(PlannerTurnRequest.class);
        verify(plannerService).handleTurn(captor.capture(), eq("test-token"));

        PlanningContext received = captor.getValue().context();
        assertEquals(
                List.of(PlanningPreference.SCENERY, PlanningPreference.TRIP_LENGTH),
                received.openPreferences()
        );
        assertEquals(PlanningPreference.DIFFICULTY, received.lastAsked());
    }

    @Test
    void shouldAcceptOldShapeContextWithoutNewFields() throws Exception {
        when(plannerService.handleTurn(
                any(PlannerTurnRequest.class),
                eq("test-token")
        )).thenReturn(new PlannerTurnResponse(
                PlannerStatus.NEEDS_CLARIFICATION,
                "How long would you like to spend hiking?",
                PlanningContext.empty(),
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
                                      "message": "Keep it easy.",
                                      "context": {
                                        "difficulty": "EASY",
                                        "preferredScenery": null
                                      },
                                      "latitude": 49.2827,
                                      "longitude": -123.1207,
                                      "tripDate": "%s"
                                    }
                                    """.formatted(TRIP_DATE))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.context.durationMode").hasJsonPath())
                .andExpect(jsonPath("$.context.durationMode")
                        .value(nullValue()));

        ArgumentCaptor<PlannerTurnRequest> captor =
                ArgumentCaptor.forClass(PlannerTurnRequest.class);
        verify(plannerService).handleTurn(captor.capture(), eq("test-token"));

        PlanningContext received = captor.getValue().context();
        assertEquals(TrailDifficulty.EASY, received.difficulty());
        assertNull(received.durationMode());
        assertEquals(List.of(), received.openPreferences());
        assertEquals(List.of(), received.preferredScenery());
        assertNull(received.lastAsked());
    }

    @Test
    void shouldRejectUnknownPlanningPreference() throws Exception {
        mockMvc.perform(
                        post("/api/planner/turn")
                                .with(jwt().jwt(jwt ->
                                        jwt.tokenValue("test-token")
                                ))
                                .contentType("application/json")
                                .content("""
                                    {
                                      "message": "any",
                                      "context": {
                                        "lastAsked": "WEATHER"
                                      },
                                      "latitude": 49.2827,
                                      "longitude": -123.1207,
                                      "tripDate": "%s"
                                    }
                                    """.formatted(TRIP_DATE))
                )
                .andExpect(status().isBadRequest());

        verifyNoInteractions(plannerService);
    }

    @Test
    void shouldSerialiseAndDeserialiseDurationMode() throws Exception {
        when(plannerService.handleTurn(
                any(PlannerTurnRequest.class),
                eq("test-token")
        )).thenReturn(new PlannerTurnResponse(
                PlannerStatus.READY_TO_RECOMMEND,
                "I found 1 trail that fit what you're looking for.",
                new PlanningContext(
                        TrailDifficulty.MODERATE,
                        null,
                        null,
                        240,
                        DurationMode.MINIMUM,
                        List.of(),
                        List.of(),
                        null
                ),
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
                                      "message": "At least four hours.",
                                      "context": {
                                        "difficulty": "MODERATE",
                                        "maxDurationMin": 240,
                                        "durationMode": "APPROXIMATE"
                                      },
                                      "latitude": 49.2827,
                                      "longitude": -123.1207,
                                      "tripDate": "%s"
                                    }
                                    """.formatted(TRIP_DATE))
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.context.maxDurationMin").value(240))
                .andExpect(jsonPath("$.context.durationMode")
                        .value("MINIMUM"));

        ArgumentCaptor<PlannerTurnRequest> captor =
                ArgumentCaptor.forClass(PlannerTurnRequest.class);
        verify(plannerService).handleTurn(captor.capture(), eq("test-token"));

        PlanningContext received = captor.getValue().context();
        assertEquals(240, received.maxDurationMin());
        assertEquals(DurationMode.APPROXIMATE, received.durationMode());
    }

    @Test
    void shouldReadOldContextDurationWithoutModeAsMaximum() throws Exception {
        when(plannerService.handleTurn(
                any(PlannerTurnRequest.class),
                eq("test-token")
        )).thenReturn(new PlannerTurnResponse(
                PlannerStatus.NEEDS_CLARIFICATION,
                "How difficult would you like the hike to be?",
                PlanningContext.empty(),
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
                                      "message": "Sounds good.",
                                      "context": {
                                        "maxDurationMin": 180,
                                        "preferredScenery": []
                                      },
                                      "latitude": 49.2827,
                                      "longitude": -123.1207,
                                      "tripDate": "%s"
                                    }
                                    """.formatted(TRIP_DATE))
                )
                .andExpect(status().isOk());

        ArgumentCaptor<PlannerTurnRequest> captor =
                ArgumentCaptor.forClass(PlannerTurnRequest.class);
        verify(plannerService).handleTurn(captor.capture(), eq("test-token"));

        PlanningContext received = captor.getValue().context();
        assertEquals(180, received.maxDurationMin());
        assertEquals(DurationMode.MAXIMUM, received.durationMode());
    }

    @Test
    void shouldRejectUnknownDurationMode() throws Exception {
        mockMvc.perform(
                        post("/api/planner/turn")
                                .with(jwt().jwt(jwt ->
                                        jwt.tokenValue("test-token")
                                ))
                                .contentType("application/json")
                                .content("""
                                    {
                                      "message": "Four hours.",
                                      "context": {
                                        "maxDurationMin": 240,
                                        "durationMode": "EXACTLY"
                                      },
                                      "latitude": 49.2827,
                                      "longitude": -123.1207,
                                      "tripDate": "%s"
                                    }
                                    """.formatted(TRIP_DATE))
                )
                .andExpect(status().isBadRequest());

        verifyNoInteractions(plannerService);
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
                                      "tripDate": "%s"
                                    }
                                    """.formatted(TRIP_DATE))
                )
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(plannerService);
    }
}
