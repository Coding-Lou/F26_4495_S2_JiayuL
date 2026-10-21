package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.dto.DurationMode;
import com.jay.outdoor.recommendation.dto.PlannerStatus;
import com.jay.outdoor.recommendation.dto.PlannerTurnRequest;
import com.jay.outdoor.recommendation.dto.PlannerTurnResponse;
import com.jay.outdoor.recommendation.dto.PlanningContext;
import com.jay.outdoor.recommendation.dto.PlanningContextDelta;
import com.jay.outdoor.recommendation.dto.PlanningPreference;
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

import static com.jay.outdoor.recommendation.dto.PlanningPreference.DIFFICULTY;
import static com.jay.outdoor.recommendation.dto.PlanningPreference.SCENERY;
import static com.jay.outdoor.recommendation.dto.PlanningPreference.TRIP_LENGTH;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
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
            LocalDate.now().plusDays(1);

    private static final String DIFFICULTY_QUESTION =
            "How difficult would you like the hike to be?";

    private static final String LENGTH_QUESTION =
            "How long would you like to spend hiking?";

    private static final String LENGTH_QUESTION_WITH_OPEN =
            "How long would you like to spend hiking, or should I keep that open too?";

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

    // A: unanswered → asks difficulty and records it.
    @Test
    void firstVagueMessageNeedsClarificationWithoutStartingRecommendations() {
        PlannerTurnRequest request = request(
                "I want to go hiking.",
                null
        );

        stubDelta(request, emptyDelta());

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(
                PlannerStatus.NEEDS_CLARIFICATION,
                response.status()
        );
        assertEquals(DIFFICULTY_QUESTION, response.assistantMessage());
        assertEquals(DIFFICULTY, response.context().lastAsked());
        assertEquals(List.of(), response.context().openPreferences());
        assertNull(response.context().difficulty());
        assertTrue(response.recommendations().isEmpty());
        verify(intentService).extractDelta(request.message(), null);
        verifyNoInteractions(recommendationService);
    }

    // The reported loop: duration first, then "any" to the difficulty question.
    @Test
    void halfDayHikeThenAnyDoesNotLoopOnDifficulty() {
        PlannerTurnRequest first = request(
                "A half-day hike, around four hours",
                null
        );
        stubDelta(first, new PlanningContextDelta(
                null, null, null, 240, null
        ));

        PlannerTurnResponse firstResponse =
                plannerService.handleTurn(first, "test-token");

        assertEquals(PlannerStatus.NEEDS_CLARIFICATION, firstResponse.status());
        assertEquals(DIFFICULTY, firstResponse.context().lastAsked());

        PlannerTurnRequest second = request("any", firstResponse.context());
        stubDelta(second, openDelta(DIFFICULTY));
        stubRecommendations(1);

        PlannerTurnResponse secondResponse =
                plannerService.handleTurn(second, "test-token");

        assertEquals(PlannerStatus.READY_TO_RECOMMEND, secondResponse.status());
        assertEquals(
                "Got it — I'll keep the difficulty open. I found 1 trail that fit what you're looking for.",
                secondResponse.assistantMessage()
        );
        assertEquals(240, secondResponse.context().maxDurationMin());
        assertEquals(
                DurationMode.APPROXIMATE,
                secondResponse.context().durationMode()
        );
        assertNull(secondResponse.context().difficulty());
        assertEquals(
                List.of(DIFFICULTY),
                secondResponse.context().openPreferences()
        );
        assertNull(secondResponse.context().lastAsked());
        verify(intentService).extractDelta("any", DIFFICULTY);
        RecommendationIntent intent = capturedIntent();
        assertNull(intent.difficulty());
        assertEquals(240, intent.maxDurationMin());
        assertEquals(DurationMode.APPROXIMATE, intent.durationMode());
    }

    // B: "any" after the difficulty question → resolved, next question is trip length.
    @Test
    void anyAfterDifficultyQuestionResolvesDifficultyAndAsksTripLength() {
        PlannerTurnRequest request = request(
                "any",
                askedContext(DIFFICULTY)
        );
        stubDelta(request, openDelta(DIFFICULTY));

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.NEEDS_CLARIFICATION, response.status());
        assertEquals(
                "Got it — I'll keep the difficulty open. " + LENGTH_QUESTION_WITH_OPEN,
                response.assistantMessage()
        );
        assertEquals(List.of(DIFFICULTY), response.context().openPreferences());
        assertEquals(TRIP_LENGTH, response.context().lastAsked());
        verify(intentService).extractDelta("any", DIFFICULTY);
        verifyNoInteractions(recommendationService);
    }

    // C: "No preference" is handled exactly like "any".
    @Test
    void noPreferenceAfterDifficultyQuestionResolvesDifficulty() {
        PlannerTurnRequest request = request(
                "No preference",
                askedContext(DIFFICULTY)
        );
        stubDelta(request, openDelta(DIFFICULTY));

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(List.of(DIFFICULTY), response.context().openPreferences());
        assertEquals(TRIP_LENGTH, response.context().lastAsked());
        assertNotEquals(DIFFICULTY_QUESTION, response.assistantMessage());
    }

    // D: a general "I'm flexible" opens everything unanswered and recommends.
    @Test
    void flexibleFirstMessageRecommendsBroadlyWithoutLooping() {
        PlannerTurnRequest request = request(
                "Whatever is good. I'm flexible.",
                null
        );
        stubDelta(request, flexibleDelta());
        stubRecommendations(3);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.READY_TO_RECOMMEND, response.status());
        assertEquals(
                "Sounds good. I'll keep that flexible. I found 3 trails that fit what you're looking for.",
                response.assistantMessage()
        );
        assertEquals(
                List.of(DIFFICULTY, SCENERY, TRIP_LENGTH),
                response.context().openPreferences()
        );
        assertNull(response.context().lastAsked());

        RecommendationIntent intent = capturedIntent();
        assertNull(intent.difficulty());
        assertEquals(List.of(), intent.preferredScenery());
        assertNull(intent.maxDurationMin());
    }

    // A general "flexible" never discards values the user already gave.
    @Test
    void generalFlexibilityKeepsValuesAlreadyGiven() {
        PlanningContext existing = new PlanningContext(
                TrailDifficulty.HARD,
                null,
                null,
                null,
                null,
                List.of(SceneryType.LAKE),
                List.of(),
                null
        );
        PlannerTurnRequest request = request("I'm flexible.", existing);
        stubDelta(request, flexibleDelta());
        stubRecommendations(0);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.READY_TO_RECOMMEND, response.status());
        assertEquals(TrailDifficulty.HARD, response.context().difficulty());
        assertEquals(
                List.of(SceneryType.LAKE),
                response.context().preferredScenery()
        );
        assertEquals(List.of(TRIP_LENGTH), response.context().openPreferences());
        assertEquals(TrailDifficulty.HARD, capturedIntent().difficulty());
    }

    // An explicitly named dimension clears its value ("actually any difficulty").
    @Test
    void namedOpenDifficultyClearsEarlierDifficulty() {
        PlanningContext existing = new PlanningContext(
                TrailDifficulty.HARD,
                null,
                null,
                120,
                null,
                List.of(SceneryType.FOREST),
                List.of(),
                null
        );
        PlannerTurnRequest request = request(
                "Actually, any difficulty.",
                existing
        );
        stubDelta(request, openDelta(DIFFICULTY));
        stubRecommendations(2);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.READY_TO_RECOMMEND, response.status());
        assertNull(response.context().difficulty());
        assertEquals(120, response.context().maxDurationMin());
        assertEquals(
                List.of(SceneryType.FOREST),
                response.context().preferredScenery()
        );
        assertEquals(List.of(DIFFICULTY), response.context().openPreferences());
        assertTrue(response.assistantMessage()
                .startsWith("Got it — I'll keep the difficulty open. "));
        assertNull(capturedIntent().difficulty());
    }

    // An explicit empty scenery list is treated as SCENERY open.
    @Test
    void explicitEmptySceneryOpensSceneryAndClearsIt() {
        PlanningContext existing = new PlanningContext(
                TrailDifficulty.EASY,
                null,
                null,
                90,
                null,
                List.of(SceneryType.LAKE),
                List.of(),
                null
        );
        PlannerTurnRequest request = request(
                "Any scenery is fine.",
                existing
        );
        stubDelta(request, new PlanningContextDelta(
                null, null, null, null, List.of()
        ));
        stubRecommendations(1);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(List.of(), response.context().preferredScenery());
        assertEquals(List.of(SCENERY), response.context().openPreferences());
        assertEquals(List.of(), capturedIntent().preferredScenery());
    }

    // E: one multi-field message resolves every field in one turn.
    @Test
    void multiFieldMessageIsMergedInOneTurn() {
        PlannerTurnRequest request = request(
                "A moderate forest hike with a viewpoint, about two hours",
                null
        );
        stubDelta(request, new PlanningContextDelta(
                TrailDifficulty.MODERATE,
                null,
                null,
                120,
                List.of(SceneryType.FOREST, SceneryType.VIEWPOINT)
        ));
        stubRecommendations(3);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.READY_TO_RECOMMEND, response.status());
        assertEquals(
                "I found 3 trails that fit what you're looking for.",
                response.assistantMessage()
        );
        assertEquals(TrailDifficulty.MODERATE, response.context().difficulty());
        assertEquals(120, response.context().maxDurationMin());
        assertEquals(
                List.of(SceneryType.FOREST, SceneryType.VIEWPOINT),
                response.context().preferredScenery()
        );
        assertEquals(List.of(), response.context().openPreferences());
        assertNull(response.context().lastAsked());

        RecommendationIntent intent = capturedIntent();
        assertEquals(TrailDifficulty.MODERATE, intent.difficulty());
        assertEquals(120, intent.maxDurationMin());
        assertEquals(
                List.of(SceneryType.FOREST, SceneryType.VIEWPOINT),
                intent.preferredScenery()
        );
    }

    // F: a resolved dimension is never asked again, even if the reply says nothing.
    @Test
    void resolvedDifficultyIsNeverReAsked() {
        PlanningContext existing = new PlanningContext(
                TrailDifficulty.EASY,
                null,
                null,
                null,
                null,
                List.of(),
                List.of(),
                TRIP_LENGTH
        );
        PlannerTurnRequest request = request("hmm", existing);
        stubDelta(request, emptyDelta());
        stubRecommendations(1);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertNotEquals(DIFFICULTY_QUESTION, response.assistantMessage());
        assertEquals(PlannerStatus.READY_TO_RECOMMEND, response.status());
        assertEquals(TrailDifficulty.EASY, response.context().difficulty());
    }

    // Ask once: the extractor returns nothing for a reply → that dimension becomes open.
    @Test
    void unhelpfulReplyToDifficultyQuestionOpensDifficulty() {
        PlannerTurnRequest request = request(
                "erm, not sure",
                askedContext(DIFFICULTY)
        );
        stubDelta(request, emptyDelta());

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.NEEDS_CLARIFICATION, response.status());
        assertEquals(List.of(DIFFICULTY), response.context().openPreferences());
        assertEquals(TRIP_LENGTH, response.context().lastAsked());
        // Opened by the ask-once fallback, not by the user: "leave ... for now".
        assertEquals(
                "I'll leave the difficulty open for now. " + LENGTH_QUESTION_WITH_OPEN,
                response.assistantMessage()
        );
    }

    @Test
    void unhelpfulReplyToTripLengthQuestionOpensTripLengthAndRecommends() {
        PlanningContext existing = new PlanningContext(
                null,
                null,
                null,
                null,
                null,
                List.of(),
                List.of(DIFFICULTY),
                TRIP_LENGTH
        );
        PlannerTurnRequest request = request("dunno", existing);
        stubDelta(request, emptyDelta());
        stubRecommendations(2);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.READY_TO_RECOMMEND, response.status());
        assertEquals(
                List.of(DIFFICULTY, TRIP_LENGTH),
                response.context().openPreferences()
        );
        assertEquals(
                "I'll leave the trip length open for now. I found 2 trails that fit what you're looking for.",
                response.assistantMessage()
        );
        assertNull(response.context().lastAsked());
    }

    // An explicit value overrides an earlier open choice.
    @Test
    void explicitValueOverridesOpenPreference() {
        PlanningContext existing = new PlanningContext(
                null,
                null,
                null,
                180,
                null,
                List.of(),
                List.of(DIFFICULTY),
                null
        );
        PlannerTurnRequest request = request(
                "Actually make it hard.",
                existing
        );
        stubDelta(request, new PlanningContextDelta(
                TrailDifficulty.HARD, null, null, null, null
        ));
        stubRecommendations(1);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(TrailDifficulty.HARD, response.context().difficulty());
        assertEquals(List.of(), response.context().openPreferences());
        assertEquals(
                "I found 1 trail that fit what you're looking for.",
                response.assistantMessage()
        );
        assertEquals(TrailDifficulty.HARD, capturedIntent().difficulty());
    }

    // A value and an open mark for the same dimension in one message: the value wins.
    @Test
    void valueInSameMessageWinsOverOpenMark() {
        PlannerTurnRequest request = request(
                "Moderate, about three hours.",
                null
        );
        stubDelta(request, new PlanningContextDelta(
                TrailDifficulty.MODERATE,
                null,
                null,
                180,
                null,
                null,
                List.of(DIFFICULTY),
                false
        ));
        stubRecommendations(1);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(TrailDifficulty.MODERATE, response.context().difficulty());
        assertEquals(List.of(), response.context().openPreferences());
        assertEquals(
                "I found 1 trail that fit what you're looking for.",
                response.assistantMessage()
        );
    }

    // G: enough information → recommendations, not another question.
    @Test
    void enoughContextDelegatesToExistingRecommendationPipeline() {
        PlanningContext existing = context(
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

        stubDelta(request, emptyDelta());
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
        assertNull(response.context().lastAsked());

        RecommendationIntent intent = capturedIntent();
        assertEquals(TrailDifficulty.EASY, intent.difficulty());
        assertEquals(120, intent.maxDurationMin());
    }

    // H: context persists across several turns.
    @Test
    void contextPersistsAcrossSeveralTurns() {
        PlannerTurnRequest first = request("Let's go for a hike.", null);
        stubDelta(first, emptyDelta());
        PlannerTurnResponse r1 = plannerService.handleTurn(first, "test-token");
        assertEquals(DIFFICULTY_QUESTION, r1.assistantMessage());

        PlannerTurnRequest second = request("Moderate please.", r1.context());
        stubDelta(second, new PlanningContextDelta(
                TrailDifficulty.MODERATE, null, null, null, null
        ));
        PlannerTurnResponse r2 = plannerService.handleTurn(second, "test-token");
        assertEquals(LENGTH_QUESTION, r2.assistantMessage());
        assertEquals(TRIP_LENGTH, r2.context().lastAsked());
        verify(intentService).extractDelta("Moderate please.", DIFFICULTY);

        PlannerTurnRequest third = request(
                "About 10 km, with a lake.",
                r2.context()
        );
        stubDelta(third, new PlanningContextDelta(
                null, 10.0, null, null, List.of(SceneryType.LAKE)
        ));
        stubRecommendations(2);
        PlannerTurnResponse r3 = plannerService.handleTurn(third, "test-token");

        assertEquals(PlannerStatus.READY_TO_RECOMMEND, r3.status());
        assertEquals(TrailDifficulty.MODERATE, r3.context().difficulty());
        assertEquals(10.0, r3.context().maxDistanceKm());
        assertEquals(List.of(SceneryType.LAKE), r3.context().preferredScenery());
        assertEquals(List.of(), r3.context().openPreferences());
        assertNull(r3.context().lastAsked());
        verify(intentService).extractDelta("About 10 km, with a lake.", TRIP_LENGTH);
    }

    // An old client context (no openPreferences, no lastAsked) still works.
    @Test
    void oldShapeContextIsAccepted() {
        PlanningContext oldShape = new PlanningContext(
                TrailDifficulty.MODERATE,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
        PlannerTurnRequest request = request("About three hours.", oldShape);
        stubDelta(request, new PlanningContextDelta(
                null, null, null, 180, null
        ));
        stubRecommendations(1);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.READY_TO_RECOMMEND, response.status());
        assertEquals(List.of(), response.context().openPreferences());
        assertEquals(List.of(), response.context().preferredScenery());
        assertNull(response.context().lastAsked());
    }

    @Test
    void addsDurationAndPreservesExistingDifficultyAndScenery() {
        PlanningContext existing = context(
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

        stubDelta(request, new PlanningContextDelta(
                null,
                null,
                null,
                180,
                null
        ));
        stubRecommendations(0);

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
        PlanningContext existing = context(
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

        stubDelta(request, new PlanningContextDelta(
                TrailDifficulty.EASY,
                null,
                null,
                null,
                null
        ));
        stubRecommendations(0);

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
        assertEquals(TrailDifficulty.EASY, capturedIntent().difficulty());
    }

    @Test
    void latestExplicitSceneryReplacesEarlierSceneryInContextAndIntent() {
        PlanningContext existing = context(
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

        stubDelta(request, new PlanningContextDelta(
                null,
                null,
                null,
                null,
                List.of(SceneryType.LAKE)
        ));
        stubRecommendations(0);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(
                List.of(SceneryType.LAKE),
                response.context().preferredScenery()
        );
        assertEquals(
                List.of(SceneryType.LAKE),
                capturedIntent().preferredScenery()
        );
    }

    @Test
    void difficultyWithoutAnotherPreferenceAsksForDuration() {
        PlannerTurnRequest request = request(
                "Keep it moderate.",
                null
        );

        stubDelta(request, new PlanningContextDelta(
                TrailDifficulty.MODERATE,
                null,
                null,
                null,
                null
        ));

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.NEEDS_CLARIFICATION, response.status());
        assertEquals(LENGTH_QUESTION, response.assistantMessage());
        assertEquals(TRIP_LENGTH, response.context().lastAsked());
        verifyNoInteractions(recommendationService);
    }

    // H: a later duration replaces the earlier value and mode.
    @Test
    void laterDurationReplacesEarlierDuration() {
        PlannerTurnRequest first = request("Moderate, around two hours.", null);
        stubDelta(first, durationDelta(
                TrailDifficulty.MODERATE, 120, DurationMode.APPROXIMATE));
        stubRecommendations(1);

        PlannerTurnResponse r1 = plannerService.handleTurn(first, "test-token");

        assertEquals(120, r1.context().maxDurationMin());
        assertEquals(DurationMode.APPROXIMATE, r1.context().durationMode());

        PlannerTurnRequest second = request(
                "Actually make it a full-day hike.",
                r1.context()
        );
        stubDelta(second, durationDelta(null, 450, DurationMode.APPROXIMATE));

        PlannerTurnResponse r2 = plannerService.handleTurn(second, "test-token");

        assertEquals(TrailDifficulty.MODERATE, r2.context().difficulty());
        assertEquals(450, r2.context().maxDurationMin());
        assertEquals(DurationMode.APPROXIMATE, r2.context().durationMode());
    }

    // H: the mode is replaced with the value, not kept from the earlier turn.
    @Test
    void laterDurationReplacesEarlierMode() {
        PlanningContext existing = new PlanningContext(
                TrailDifficulty.HARD,
                null,
                null,
                360,
                DurationMode.MAXIMUM,
                List.of(),
                List.of(),
                null
        );
        PlannerTurnRequest request = request("At least four hours.", existing);
        stubDelta(request, durationDelta(null, 240, DurationMode.MINIMUM));
        stubRecommendations(1);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(240, response.context().maxDurationMin());
        assertEquals(DurationMode.MINIMUM, response.context().durationMode());
        RecommendationIntent intent = capturedIntent();
        assertEquals(240, intent.maxDurationMin());
        assertEquals(DurationMode.MINIMUM, intent.durationMode());
    }

    // A message that does not mention duration keeps its value and mode.
    @Test
    void unmentionedDurationKeepsValueAndMode() {
        PlanningContext existing = new PlanningContext(
                TrailDifficulty.MODERATE,
                null,
                null,
                240,
                DurationMode.APPROXIMATE,
                List.of(),
                List.of(),
                null
        );
        PlannerTurnRequest request = request("Make it easy instead.", existing);
        stubDelta(request, new PlanningContextDelta(
                TrailDifficulty.EASY, null, null, null, null
        ));
        stubRecommendations(1);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(TrailDifficulty.EASY, response.context().difficulty());
        assertEquals(240, response.context().maxDurationMin());
        assertEquals(DurationMode.APPROXIMATE, response.context().durationMode());
    }

    // I: "any trip length" clears duration, its mode, distance and elevation.
    @Test
    void anyTripLengthClearsDurationAndItsMode() {
        PlanningContext existing = new PlanningContext(
                TrailDifficulty.MODERATE,
                10.0,
                500,
                240,
                DurationMode.APPROXIMATE,
                List.of(),
                List.of(),
                null
        );
        PlannerTurnRequest request = request("Any trip length.", existing);
        stubDelta(request, openDelta(TRIP_LENGTH));
        stubRecommendations(2);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.READY_TO_RECOMMEND, response.status());
        assertNull(response.context().maxDurationMin());
        assertNull(response.context().durationMode());
        assertNull(response.context().maxDistanceKm());
        assertNull(response.context().maxElevationGainM());
        assertEquals(List.of(TRIP_LENGTH), response.context().openPreferences());
        assertEquals(
                "Got it — I'll keep the trip length open. I found 2 trails that fit what you're looking for.",
                response.assistantMessage()
        );

        RecommendationIntent intent = capturedIntent();
        assertNull(intent.maxDurationMin());
        assertNull(intent.durationMode());
    }

    // J: an old context with maxDurationMin and no mode keeps its old meaning.
    @Test
    void oldContextDurationWithoutModeIsReadAsMaximum() {
        PlanningContext oldShape = new PlanningContext(
                TrailDifficulty.MODERATE,
                null,
                null,
                180,
                null,
                null,
                null,
                null
        );
        PlannerTurnRequest request = request("Sounds good.", oldShape);
        stubDelta(request, emptyDelta());
        stubRecommendations(1);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.READY_TO_RECOMMEND, response.status());
        assertEquals(180, response.context().maxDurationMin());
        assertEquals(DurationMode.MAXIMUM, response.context().durationMode());
        RecommendationIntent intent = capturedIntent();
        assertEquals(180, intent.maxDurationMin());
        assertEquals(DurationMode.MAXIMUM, intent.durationMode());
    }

    // Wording: an explicit no-preference keeps "Got it — I'll keep ... open."
    // while the ask-once fallback in the same turn says "leave ... for now".
    @Test
    void explicitAndFallbackOpeningsAreWordedDifferently() {
        PlannerTurnRequest request = request(
                "Any scenery.",
                askedContext(DIFFICULTY)
        );
        stubDelta(request, openDelta(SCENERY));
        stubRecommendations(1);

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertEquals(PlannerStatus.READY_TO_RECOMMEND, response.status());
        assertEquals(
                List.of(DIFFICULTY, SCENERY),
                response.context().openPreferences()
        );
        assertEquals(
                "Got it — I'll keep the scenery open. I'll leave the difficulty open for now. I found 1 trail that fit what you're looking for.",
                response.assistantMessage()
        );
    }

    @Test
    void explicitNoPreferenceToDifficultyQuestionKeepsExplicitWording() {
        PlannerTurnRequest request = request(
                "No preference",
                askedContext(DIFFICULTY)
        );
        stubDelta(request, openDelta(DIFFICULTY));

        PlannerTurnResponse response =
                plannerService.handleTurn(request, "test-token");

        assertTrue(response.assistantMessage()
                .startsWith("Got it — I'll keep the difficulty open. "));
        assertTrue(!response.assistantMessage().contains("for now"));
    }

    private PlanningContextDelta durationDelta(
            TrailDifficulty difficulty,
            Integer durationMin,
            DurationMode mode
    ) {
        return new PlanningContextDelta(
                difficulty,
                null,
                null,
                durationMin,
                mode,
                null,
                List.of(),
                false
        );
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

    private PlanningContext context(
            TrailDifficulty difficulty,
            Double maxDistanceKm,
            Integer maxElevationGainM,
            Integer maxDurationMin,
            List<SceneryType> preferredScenery
    ) {
        return new PlanningContext(
                difficulty,
                maxDistanceKm,
                maxElevationGainM,
                maxDurationMin,
                null,
                preferredScenery,
                List.of(),
                null
        );
    }

    private PlanningContext askedContext(PlanningPreference lastAsked) {
        return new PlanningContext(
                null,
                null,
                null,
                null,
                null,
                List.of(),
                List.of(),
                lastAsked
        );
    }

    private void stubDelta(
            PlannerTurnRequest request,
            PlanningContextDelta delta
    ) {
        PlanningPreference pending = request.context() == null
                ? null
                : request.context().lastAsked();

        when(intentService.extractDelta(request.message(), pending))
                .thenReturn(delta);
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

    private PlanningContextDelta openDelta(PlanningPreference preference) {
        return new PlanningContextDelta(
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(preference),
                false
        );
    }

    private PlanningContextDelta flexibleDelta() {
        return new PlanningContextDelta(
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(),
                true
        );
    }

    private void stubRecommendations(int count) {
        List<ScoredTrailRecommendation> recommendations =
                java.util.stream.Stream
                        .generate(() -> mock(ScoredTrailRecommendation.class))
                        .limit(count)
                        .toList();

        when(recommendationService.recommend(
                any(RecommendationIntent.class),
                anyDouble(),
                anyDouble(),
                eq(TRIP_DATE),
                isNull(),
                eq("test-token")
        )).thenReturn(new RecommendationResponse(recommendations));
    }

    private RecommendationIntent capturedIntent() {
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

        return intentCaptor.getValue();
    }
}
