package com.jay.outdoor.recommendation.ai;

import com.jay.outdoor.recommendation.dto.DurationMode;
import com.jay.outdoor.recommendation.dto.PlanningContextDelta;
import com.jay.outdoor.recommendation.dto.PlanningPreference;
import com.jay.outdoor.recommendation.dto.RecommendationIntent;
import com.jay.outdoor.recommendation.dto.SceneryType;
import com.jay.outdoor.recommendation.dto.TrailDifficulty;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OpenAiIntentExtractorTest {

    private OpenAiIntentClient intentClient;
    private OpenAiIntentExtractor intentExtractor;

    @BeforeEach
    void setUp() {

        intentClient = mock(OpenAiIntentClient.class);

        IntentPromptBuilder promptBuilder =
                new IntentPromptBuilder();

        intentExtractor =
                new OpenAiIntentExtractor(
                        intentClient,
                        promptBuilder
                );
    }

    @Test
    void shouldConvertLlmOutputToRecommendationIntent() {

        IntentExtractionOutput output =
                new IntentExtractionOutput();

        output.difficulty =
                Optional.of(TrailDifficulty.MODERATE);

        output.maxDistanceKm =
                Optional.of(10.0);

        output.maxElevationGainM =
                Optional.of(500);

        output.durationMin =
                Optional.of(180);

        output.preferredScenery =
                Optional.of(List.of(
                        SceneryType.LAKE,
                        SceneryType.VIEWPOINT
                ));

        when(
                intentClient.extract(
                        anyString(),
                        anyString()
                )
        ).thenReturn(output);

        RecommendationIntent result =
                intentExtractor.extract(
                        "I want a moderate hike with a lake view."
                );

        assertEquals(
                TrailDifficulty.MODERATE,
                result.difficulty()
        );

        assertEquals(
                10.0,
                result.maxDistanceKm()
        );

        assertEquals(
                500,
                result.maxElevationGainM()
        );

        assertEquals(
                180,
                result.maxDurationMin()
        );

        assertEquals(
                List.of(
                        SceneryType.LAKE,
                        SceneryType.VIEWPOINT
                ),
                result.preferredScenery()
        );
    }

    @Test
    void shouldHandleMissingPreferences() {

        IntentExtractionOutput output =
                new IntentExtractionOutput();

        output.difficulty = Optional.empty();
        output.maxDistanceKm = Optional.empty();
        output.maxElevationGainM = Optional.empty();
        output.durationMin = Optional.empty();
        output.preferredScenery = Optional.empty();

        when(
                intentClient.extract(
                        anyString(),
                        anyString()
                )
        ).thenReturn(output);

        RecommendationIntent result =
                intentExtractor.extract(
                        "I want to go hiking this weekend."
                );

        assertNull(result.difficulty());
        assertNull(result.maxDistanceKm());
        assertNull(result.maxElevationGainM());
        assertNull(result.maxDurationMin());

        assertEquals(
                List.of(),
                result.preferredScenery()
        );
    }

    @Test
    void shouldPreserveUnmentionedFieldsInPlanningDelta() {

        IntentExtractionOutput output =
                new IntentExtractionOutput();

        output.difficulty = Optional.empty();
        output.maxDistanceKm = Optional.empty();
        output.maxElevationGainM = Optional.empty();
        output.durationMin = Optional.of(180);
        output.preferredScenery = Optional.empty();

        when(
                intentClient.extract(
                        anyString(),
                        anyString()
                )
        ).thenReturn(output);

        PlanningContextDelta result =
                intentExtractor.extractDelta(
                        "About three hours.",
                        null
                );

        assertNull(result.difficulty());
        assertNull(result.maxDistanceKm());
        assertNull(result.maxElevationGainM());
        assertEquals(180, result.maxDurationMin());
        assertNull(result.preferredScenery());
    }

    @Test
    void shouldMapExplicitEasyCorrectionToPlanningDelta() {
        IntentExtractionOutput output = emptyOutput();
        output.difficulty = Optional.of(TrailDifficulty.EASY);

        when(intentClient.extract(anyString(), anyString()))
                .thenReturn(output);

        PlanningContextDelta result =
                intentExtractor.extractDelta(
                        "make it an easy hike instead",
                        null
                );

        assertEquals(TrailDifficulty.EASY, result.difficulty());
    }

    @Test
    void shouldMapExplicitLakePreferenceToPlanningDelta() {
        IntentExtractionOutput output = emptyOutput();
        output.preferredScenery = Optional.of(
                List.of(SceneryType.LAKE)
        );

        when(intentClient.extract(anyString(), anyString()))
                .thenReturn(output);

        PlanningContextDelta result =
                intentExtractor.extractDelta(
                        "Actually I'd rather go somewhere with a lake.",
                        null
                );

        assertEquals(
                List.of(SceneryType.LAKE),
                result.preferredScenery()
        );
    }

    @Test
    void shouldMapOpenPreferencesToPlanningDelta() {
        IntentExtractionOutput output = emptyOutput();
        output.openPreferences = Optional.of(
                List.of(PlanningPreference.DIFFICULTY)
        );
        output.generallyFlexible = Optional.empty();

        when(intentClient.extract(anyString(), anyString()))
                .thenReturn(output);

        PlanningContextDelta result =
                intentExtractor.extractDelta(
                        "any",
                        PlanningPreference.DIFFICULTY
                );

        assertEquals(
                List.of(PlanningPreference.DIFFICULTY),
                result.openPreferences()
        );
        assertFalse(result.generallyFlexible());
        assertNull(result.difficulty());
    }

    @Test
    void shouldMapGeneralFlexibilityToPlanningDelta() {
        IntentExtractionOutput output = emptyOutput();
        output.openPreferences = Optional.empty();
        output.generallyFlexible = Optional.of(true);

        when(intentClient.extract(anyString(), anyString()))
                .thenReturn(output);

        PlanningContextDelta result =
                intentExtractor.extractDelta(
                        "Whatever is good. I'm flexible.",
                        null
                );

        assertTrue(result.generallyFlexible());
        assertEquals(List.of(), result.openPreferences());
    }

    @Test
    void shouldTreatAbsentOpenFieldsAsNoOpenPreferences() {
        IntentExtractionOutput output = emptyOutput();

        when(intentClient.extract(anyString(), anyString()))
                .thenReturn(output);

        PlanningContextDelta result =
                intentExtractor.extractDelta("About three hours.", null);

        assertEquals(List.of(), result.openPreferences());
        assertFalse(result.generallyFlexible());
    }

    @Test
    void shouldPassPendingQuestionToUserPromptForPlannerTurns() {
        when(intentClient.extract(anyString(), anyString()))
                .thenReturn(emptyOutput());

        intentExtractor.extractDelta("any", PlanningPreference.DIFFICULTY);

        ArgumentCaptor<String> userPrompt =
                ArgumentCaptor.forClass(String.class);
        verify(intentClient).extract(anyString(), userPrompt.capture());

        assertTrue(userPrompt.getValue().contains(
                "The planner's pending question asked about DIFFICULTY"
        ));
        assertTrue(userPrompt.getValue().contains(
                "<user_message>\nany\n</user_message>"
        ));
    }

    @Test
    void shouldNotAddPendingQuestionToOneShotPrompt() {
        when(intentClient.extract(anyString(), anyString()))
                .thenReturn(emptyOutput());

        intentExtractor.extract("I want a moderate hike.");

        ArgumentCaptor<String> userPrompt =
                ArgumentCaptor.forClass(String.class);
        verify(intentClient).extract(anyString(), userPrompt.capture());

        assertFalse(userPrompt.getValue().contains("pending question"));
    }

    // A-D (and MINIMUM): the structured output's duration and mode map to
    // the planning delta unchanged. The model's reading of each phrase is
    // taught by the prompt (IntentPromptBuilderTest).
    @ParameterizedTest(name = "{0} -> {2} {1}")
    @CsvSource(delimiter = '|', value = {
            "around four hours   | 240 | APPROXIMATE",
            "about four hours    | 240 | APPROXIMATE",
            "half-day            | 240 | APPROXIMATE",
            "up to six hours     | 360 | MAXIMUM",
            "at least four hours | 240 | MINIMUM"
    })
    void shouldMapDurationAndModeToPlanningDelta(
            String message,
            int durationMin,
            DurationMode mode
    ) {
        IntentExtractionOutput output = emptyOutput();
        output.durationMin = Optional.of(durationMin);
        output.durationMode = Optional.of(mode);

        when(intentClient.extract(anyString(), anyString()))
                .thenReturn(output);

        PlanningContextDelta result =
                intentExtractor.extractDelta(message, null);

        assertEquals(durationMin, result.maxDurationMin());
        assertEquals(mode, result.durationMode());
    }

    @Test
    void shouldReadADurationWithoutModeAsApproximate() {
        IntentExtractionOutput output = emptyOutput();
        output.durationMin = Optional.of(240);
        output.durationMode = Optional.empty();

        when(intentClient.extract(anyString(), anyString()))
                .thenReturn(output);

        assertEquals(
                DurationMode.APPROXIMATE,
                intentExtractor.extractDelta("four hours", null).durationMode()
        );
        assertEquals(
                DurationMode.APPROXIMATE,
                intentExtractor.extract("four hours").durationMode()
        );
    }

    @Test
    void shouldDropAModeWithoutDuration() {
        IntentExtractionOutput output = emptyOutput();
        output.durationMode = Optional.of(DurationMode.MAXIMUM);

        when(intentClient.extract(anyString(), anyString()))
                .thenReturn(output);

        PlanningContextDelta delta =
                intentExtractor.extractDelta("an easy hike", null);

        assertNull(delta.maxDurationMin());
        assertNull(delta.durationMode());
    }

    // The one-shot /api/recommendations/query maps the mode the same way.
    @Test
    void shouldMapDurationModeInOneShotIntent() {
        IntentExtractionOutput output = emptyOutput();
        output.durationMin = Optional.of(360);
        output.durationMode = Optional.of(DurationMode.MAXIMUM);

        when(intentClient.extract(anyString(), anyString()))
                .thenReturn(output);

        RecommendationIntent result =
                intentExtractor.extract("Up to six hours.");

        assertEquals(360, result.maxDurationMin());
        assertEquals(DurationMode.MAXIMUM, result.durationMode());
    }

    private IntentExtractionOutput emptyOutput() {
        IntentExtractionOutput output = new IntentExtractionOutput();
        output.difficulty = Optional.empty();
        output.maxDistanceKm = Optional.empty();
        output.maxElevationGainM = Optional.empty();
        output.durationMin = Optional.empty();
        output.preferredScenery = Optional.empty();
        return output;
    }
}
