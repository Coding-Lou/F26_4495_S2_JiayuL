package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse;
import com.jay.outdoor.recommendation.client.trail.TrailSummaryResponse;
import com.jay.outdoor.recommendation.dto.GearCategory;
import com.jay.outdoor.recommendation.dto.RecommendationIntent;
import com.jay.outdoor.recommendation.dto.ScoredTrailRecommendation;
import com.jay.outdoor.recommendation.dto.SceneryType;
import com.jay.outdoor.recommendation.dto.TrailCandidateContext;
import com.jay.outdoor.recommendation.dto.TrailDifficulty;
import com.jay.outdoor.recommendation.dto.TrailWeather;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrailScoringServiceTest {

    private static final TrailWeather GOOD_WEATHER =
            new TrailWeather(12.0, 10.0, 10.0);

    private TrailScoringService scoringService;

    @BeforeEach
    void setUp() {
        scoringService = new TrailScoringService();
    }

    @Test
    void explicitEasyDifficultyExcludesModerateAndHardCandidates() {
        RecommendationIntent intent = intent(
                TrailDifficulty.EASY,
                List.of()
        );

        List<ScoredTrailRecommendation> result =
                scoringService.scoreTopTrails(
                        List.of(
                                candidate(
                                        "Moderate Trail",
                                        "MODERATE",
                                        Set.of(SceneryType.FOREST),
                                        GOOD_WEATHER,
                                        1.0
                                ),
                                candidate(
                                        "Hard Trail",
                                        "HARD",
                                        Set.of(SceneryType.MOUNTAIN),
                                        GOOD_WEATHER,
                                        1.0
                                ),
                                candidate(
                                        "Easy Trail",
                                        "EASY",
                                        Set.of(SceneryType.LAKE),
                                        GOOD_WEATHER,
                                        40.0
                                )
                        ),
                        intent,
                        50.0
                );

        assertEquals(1, result.size());
        assertEquals("Easy Trail", result.getFirst().trail().name());
    }

    @Test
    void explicitLakePreferenceReturnsOnlyLakeCandidates() {
        RecommendationIntent intent = intent(
                TrailDifficulty.MODERATE,
                List.of(SceneryType.LAKE)
        );

        List<ScoredTrailRecommendation> result =
                scoringService.scoreTopTrails(
                        List.of(
                                candidate(
                                        "Nearby Viewpoint",
                                        "MODERATE",
                                        Set.of(SceneryType.VIEWPOINT),
                                        GOOD_WEATHER,
                                        1.0
                                ),
                                candidate(
                                        "Distant Lake",
                                        "MODERATE",
                                        Set.of(SceneryType.LAKE),
                                        new TrailWeather(35.0, 80.0, 60.0),
                                        49.0
                                )
                        ),
                        intent,
                        50.0
                );

        assertEquals(1, result.size());
        assertEquals("Distant Lake", result.getFirst().trail().name());
        assertEquals(10, result.getFirst().breakdown().scenery());
    }

    @Test
    void explicitLakePreferenceReturnsNoContradictoryRecommendationWhenNoLakeExists() {
        RecommendationIntent intent = intent(
                TrailDifficulty.MODERATE,
                List.of(SceneryType.LAKE)
        );

        List<ScoredTrailRecommendation> result =
                scoringService.scoreTopTrails(
                        List.of(
                                candidate(
                                        "Forest Trail",
                                        "MODERATE",
                                        Set.of(SceneryType.FOREST),
                                        GOOD_WEATHER,
                                        5.0
                                )
                        ),
                        intent,
                        50.0
                );

        assertTrue(result.isEmpty());
    }

    @Test
    void multipleSceneryPreferencesUseAnyMatchEligibility() {
        RecommendationIntent intent = intent(
                TrailDifficulty.MODERATE,
                List.of(
                        SceneryType.LAKE,
                        SceneryType.WATERFALL
                )
        );

        List<ScoredTrailRecommendation> result =
                scoringService.scoreTopTrails(
                        List.of(
                                candidate(
                                        "Lake Trail",
                                        "MODERATE",
                                        Set.of(SceneryType.LAKE),
                                        GOOD_WEATHER,
                                        10.0
                                ),
                                candidate(
                                        "Waterfall Trail",
                                        "MODERATE",
                                        Set.of(SceneryType.WATERFALL),
                                        GOOD_WEATHER,
                                        10.0
                                ),
                                candidate(
                                        "Ocean Trail",
                                        "MODERATE",
                                        Set.of(SceneryType.OCEAN),
                                        GOOD_WEATHER,
                                        1.0
                                )
                        ),
                        intent,
                        50.0
                );

        assertEquals(2, result.size());
        assertEquals(
                Set.of("Lake Trail", "Waterfall Trail"),
                Set.of(
                        result.get(0).trail().name(),
                        result.get(1).trail().name()
                )
        );
    }

    @Test
    void noExplicitDifficultyPreservesExistingCandidateEligibility() {
        RecommendationIntent intent = intent(
                null,
                List.of()
        );

        List<ScoredTrailRecommendation> result =
                scoringService.scoreTopTrails(
                        List.of(
                                candidate(
                                        "Easy Trail",
                                        "EASY",
                                        Set.of(SceneryType.FOREST),
                                        GOOD_WEATHER,
                                        10.0
                                ),
                                candidate(
                                        "Hard Trail",
                                        "HARD",
                                        Set.of(SceneryType.MOUNTAIN),
                                        GOOD_WEATHER,
                                        10.0
                                )
                        ),
                        intent,
                        50.0
                );

        assertEquals(2, result.size());
    }

    @Test
    void noExplicitSceneryPreservesExistingCandidateEligibility() {
        RecommendationIntent intent = intent(
                TrailDifficulty.MODERATE,
                List.of()
        );

        List<ScoredTrailRecommendation> result =
                scoringService.scoreTopTrails(
                        List.of(
                                candidate(
                                        "Lake Trail",
                                        "MODERATE",
                                        Set.of(SceneryType.LAKE),
                                        GOOD_WEATHER,
                                        10.0
                                ),
                                candidate(
                                        "Forest Trail",
                                        "MODERATE",
                                        Set.of(SceneryType.FOREST),
                                        GOOD_WEATHER,
                                        10.0
                                )
                        ),
                        intent,
                        50.0
                );

        assertEquals(2, result.size());
    }

    @Test
    void existingScoreOrderingStillAppliesAmongEligibleCandidates() {
        RecommendationIntent intent = intent(
                TrailDifficulty.MODERATE,
                List.of(SceneryType.LAKE)
        );

        List<ScoredTrailRecommendation> result =
                scoringService.scoreTopTrails(
                        List.of(
                                candidate(
                                        "Lower Score Lake",
                                        "MODERATE",
                                        Set.of(SceneryType.LAKE),
                                        new TrailWeather(35.0, 80.0, 60.0),
                                        49.0
                                ),
                                candidate(
                                        "Higher Score Lake",
                                        "MODERATE",
                                        Set.of(SceneryType.LAKE),
                                        GOOD_WEATHER,
                                        1.0
                                )
                        ),
                        intent,
                        50.0
                );

        assertEquals(2, result.size());
        assertEquals(
                "Higher Score Lake",
                result.getFirst().trail().name()
        );
        assertTrue(result.getFirst().score() > result.get(1).score());
    }

    private RecommendationIntent intent(
            TrailDifficulty difficulty,
            List<SceneryType> preferredScenery
    ) {
        return new RecommendationIntent(
                difficulty,
                10.0,
                500,
                180,
                preferredScenery
        );
    }

    private TrailCandidateContext candidate(
            String name,
            String difficulty,
            Set<SceneryType> scenery,
            TrailWeather weather,
            double distanceFromUserKm
    ) {
        Set<String> wireScenery = scenery.stream()
                .map(Enum::name)
                .collect(Collectors.toSet());

        NearbyTrailResponse trail = new NearbyTrailResponse(
                new TrailSummaryResponse(
                        UUID.randomUUID(),
                        name,
                        "Test trail",
                        difficulty,
                        5.0,
                        200,
                        120,
                        49.2827,
                        -123.1207,
                        "TEST",
                        wireScenery,
                        "https://example.com/trail.jpg",
                        Set.of(
                                GearCategory.FOOTWEAR,
                                GearCategory.WATER
                        )
                ),
                distanceFromUserKm
        );

        return new TrailCandidateContext(
                trail,
                weather,
                scenery,
                List.of(GearCategory.FOOTWEAR),
                List.of(GearCategory.FOOTWEAR)
        );
    }
}
