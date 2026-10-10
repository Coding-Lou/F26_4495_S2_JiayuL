package com.jay.outdoor.recommendation.ai;

import com.jay.outdoor.recommendation.dto.RecommendationIntent;
import com.jay.outdoor.recommendation.dto.SceneryType;
import com.jay.outdoor.recommendation.dto.TrailDifficulty;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
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

        output.maxDurationMin =
                Optional.of(180);

        output.preferredScenery =
                List.of(
                        SceneryType.LAKE,
                        SceneryType.VIEWPOINT
                );

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
        output.maxDurationMin = Optional.empty();
        output.preferredScenery = List.of();

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
}