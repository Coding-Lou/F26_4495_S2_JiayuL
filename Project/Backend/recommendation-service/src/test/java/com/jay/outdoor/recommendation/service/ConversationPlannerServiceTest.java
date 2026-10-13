package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.dto.PlannerStatus;
import com.jay.outdoor.recommendation.dto.PlannerTurnRequest;
import com.jay.outdoor.recommendation.dto.PlannerTurnResponse;
import com.jay.outdoor.recommendation.dto.PlanningContext;
import com.jay.outdoor.recommendation.dto.PlanningContextDelta;
import com.jay.outdoor.recommendation.dto.RecommendationIntent;
import com.jay.outdoor.recommendation.dto.RecommendationResponse;
import com.jay.outdoor.recommendation.dto.SceneryType;
import com.jay.outdoor.recommendation.dto.ScoredTrailRecommendation;
import com.jay.outdoor.recommendation.dto.TrailDifficulty;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ConversationPlannerServiceTest {

    private static final LocalDate TRIP_DATE =
            LocalDate.of(2026, 10, 17);

    private RecommendationIntentService intentService;
    private RecommendationService recommendationService;
    private ConversationPlannerService plannerService;

    @BeforeEach
    void setUp() {
        intentService = mock(RecommendationIntentService.class);
        recommendationService = mock(RecommendationService.class);
        plannerService = new ConversationPlannerService(
                intentService,
                recommendationService
        );
    }

    @Test
    void firstVagueMessageNeedsClarificationWithoutStartingRecommendations() {
        PlannerTurnRequest request = request(
                "I want to go hiking.",
                null
        );

        when(intentService.extractDelta(request.message()))
                .thenReturn(emptyDelta());

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(
                PlannerStatus.NEEDS_CLARIFICATION,
                response.status()
        );
        assertEquals(
                "How difficult would you like the hike to be?",
                response.assistantMessage()
        );
        assertEquals(PlanningContext.empty(), response.context());
        assertTrue(response.recommendations().isEmpty());
        verifyNoInteractions(recommendationService);
    }

    @Test
    void addsDurationAndPreservesExistingDifficultyAndScenery() {
        PlanningContext existing = new PlanningContext(
                TrailDifficulty.MODERATE,
                null,
                null,
                null,
                List.of(SceneryType.LAKE)
        );
        PlannerTurnRequest request = request(
                "About three hours.",
                existing
        );

        when(intentService.extractDelta(request.message()))
                .thenReturn(new PlanningContextDelta(
                        null,
                        null,
                        null,
                        180,
                        null
                ));
        stubEmptyRecommendations();

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(TrailDifficulty.MODERATE, response.context().difficulty());
        assertEquals(180, response.context().maxDurationMin());
        assertEquals(
                List.of(SceneryType.LAKE),
                response.context().preferredScenery()
        );
        assertEquals(PlannerStatus.READY_TO_RECOMMEND, response.status());
    }

    @Test
    void userCorrectionOverridesDifficultyAndPreservesUnmentionedValues() {
        PlanningContext existing = new PlanningContext(
                TrailDifficulty.MODERATE,
                12.0,
                500,
                180,
                List.of(SceneryType.LAKE)
        );
        PlannerTurnRequest request = request(
                "make it an easy hike instead",
                existing
        );

        when(intentService.extractDelta(request.message()))
                .thenReturn(new PlanningContextDelta(
                        TrailDifficulty.EASY,
                        null,
                        null,
                        null,
                        null
                ));
        stubEmptyRecommendations();

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(TrailDifficulty.EASY, response.context().difficulty());
        assertEquals(12.0, response.context().maxDistanceKm());
        assertEquals(500, response.context().maxElevationGainM());
        assertEquals(180, response.context().maxDurationMin());
        assertEquals(
                List.of(SceneryType.LAKE),
                response.context().preferredScenery()
        );
        assertTrue(response.recommendations().isEmpty());
        assertEquals(
                "I couldn't find a trail that fits those preferences.",
                response.assistantMessage()
        );

        ArgumentCaptor<RecommendationIntent> intentCaptor =
                ArgumentCaptor.forClass(RecommendationIntent.class);

        verify(recommendationService).recommend(
                intentCaptor.capture(),
                eq(49.2827),
                eq(-123.1207),
                eq(TRIP_DATE),
                isNull(),
                eq("test-token")
        );
        assertEquals(
                TrailDifficulty.EASY,
                intentCaptor.getValue().difficulty()
        );
    }

    @Test
    void latestExplicitSceneryReplacesEarlierSceneryInContextAndIntent() {
        PlanningContext existing = new PlanningContext(
                TrailDifficulty.MODERATE,
                null,
                null,
                180,
                List.of(SceneryType.MOUNTAIN)
        );
        PlannerTurnRequest request = request(
                "Actually I'd rather go somewhere with a lake.",
                existing
        );

        when(intentService.extractDelta(request.message()))
                .thenReturn(new PlanningContextDelta(
                        null,
                        null,
                        null,
                        null,
                        List.of(SceneryType.LAKE)
                ));
        stubEmptyRecommendations();

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(
                List.of(SceneryType.LAKE),
                response.context().preferredScenery()
        );

        ArgumentCaptor<RecommendationIntent> intentCaptor =
                ArgumentCaptor.forClass(RecommendationIntent.class);

        verify(recommendationService).recommend(
                intentCaptor.capture(),
                eq(49.2827),
                eq(-123.1207),
                eq(TRIP_DATE),
                isNull(),
                eq("test-token")
        );
        assertEquals(
                List.of(SceneryType.LAKE),
                intentCaptor.getValue().preferredScenery()
        );
    }

    @Test
    void enoughContextDelegatesToExistingRecommendationPipeline() {
        PlanningContext existing = new PlanningContext(
                TrailDifficulty.EASY,
                null,
                null,
                120,
                List.of()
        );
        PlannerTurnRequest request = request(
                "That sounds good.",
                existing
        );
        ScoredTrailRecommendation recommendation =
                mock(ScoredTrailRecommendation.class);

        when(intentService.extractDelta(request.message()))
                .thenReturn(emptyDelta());
        when(recommendationService.recommend(
                any(RecommendationIntent.class),
                anyDouble(),
                anyDouble(),
                eq(TRIP_DATE),
                isNull(),
                eq("test-token")
        )).thenReturn(new RecommendationResponse(List.of(recommendation)));

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.READY_TO_RECOMMEND, response.status());
        assertEquals(List.of(recommendation), response.recommendations());

        ArgumentCaptor<RecommendationIntent> intentCaptor =
                ArgumentCaptor.forClass(RecommendationIntent.class);

        verify(recommendationService).recommend(
                intentCaptor.capture(),
                eq(49.2827),
                eq(-123.1207),
                eq(TRIP_DATE),
                isNull(),
                eq("test-token")
        );
        assertEquals(TrailDifficulty.EASY, intentCaptor.getValue().difficulty());
        assertEquals(120, intentCaptor.getValue().maxDurationMin());
    }

    @Test
    void difficultyWithoutAnotherPreferenceAsksForDuration() {
        PlannerTurnRequest request = request(
                "Keep it moderate.",
                null
        );

        when(intentService.extractDelta(request.message()))
                .thenReturn(new PlanningContextDelta(
                        TrailDifficulty.MODERATE,
                        null,
                        null,
                        null,
                        null
                ));

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.NEEDS_CLARIFICATION, response.status());
        assertEquals(
                "How long would you like to spend hiking?",
                response.assistantMessage()
        );
        verifyNoInteractions(recommendationService);
    }

    private PlannerTurnRequest request(
            String message,
            PlanningContext context
    ) {
        return new PlannerTurnRequest(
                message,
                context,
                49.2827,
                -123.1207,
                TRIP_DATE,
                null
        );
    }

    private PlanningContextDelta emptyDelta() {
        return new PlanningContextDelta(
                null,
                null,
                null,
                null,
                null
        );
    }

    private void stubEmptyRecommendations() {
        when(recommendationService.recommend(
                any(RecommendationIntent.class),
                anyDouble(),
                anyDouble(),
                eq(TRIP_DATE),
                isNull(),
                eq("test-token")
        )).thenReturn(new RecommendationResponse(List.of()));
    }
}
