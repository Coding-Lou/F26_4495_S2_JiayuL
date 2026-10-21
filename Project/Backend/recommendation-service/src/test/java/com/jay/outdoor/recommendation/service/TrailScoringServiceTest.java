package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse;
import com.jay.outdoor.recommendation.client.trail.TrailSummaryResponse;
import com.jay.outdoor.recommendation.dto.DurationMode;
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

    // E: MAXIMUM is a hard filter in the final ranking.
    @Test
    void maximumDurationNeverReturnsALongerTrail() {
        RecommendationIntent intent =
                durationIntent(DurationMode.MAXIMUM, 360);

        List<ScoredTrailRecommendation> result =
                scoringService.scoreTopTrails(
                        List.of(
                                candidateWithDuration("405 min", 405, 1.0),
                                candidateWithDuration("360 min", 360, 5.0),
                                candidateWithDuration("300 min", 300, 9.0)
                        ),
                        intent,
                        50.0
                );

        assertEquals(
                Set.of("360 min", "300 min"),
                names(result)
        );
        result.forEach(recommendation ->
                assertEquals(10, durationPoints(recommendation)));
    }

    // E: MAXIMUM is applied before the weather shortlist, so an over-limit
    // trail never gets a weather lookup.
    @Test
    void maximumDurationExcludesLongerTrailsFromWeatherShortlist() {
        List<TrailCandidateContext> shortlist =
                scoringService.shortlistForWeather(
                        List.of(
                                candidateWithDuration("405 min", 405, 1.0),
                                candidateWithDuration("240 min", 240, 30.0)
                        ),
                        durationIntent(DurationMode.MAXIMUM, 360),
                        50.0,
                        15
                );

        assertEquals(1, shortlist.size());
        assertEquals(
                "240 min",
                shortlist.getFirst().trail().trail().name()
        );
    }

    // F: MINIMUM excludes shorter trails, before and after the shortlist.
    @Test
    void minimumDurationExcludesShorterTrails() {
        RecommendationIntent intent =
                durationIntent(DurationMode.MINIMUM, 240);
        List<TrailCandidateContext> candidates = List.of(
                candidateWithDuration("120 min", 120, 1.0),
                candidateWithDuration("239 min", 239, 2.0),
                candidateWithDuration("240 min", 240, 3.0),
                candidateWithDuration("405 min", 405, 4.0)
        );

        List<ScoredTrailRecommendation> result =
                scoringService.scoreTopTrails(candidates, intent, 50.0);
        List<TrailCandidateContext> shortlist =
                scoringService.shortlistForWeather(
                        candidates, intent, 50.0, 15);

        assertEquals(Set.of("240 min", "405 min"), names(result));
        assertEquals(2, shortlist.size());
        result.forEach(recommendation ->
                assertEquals(10, durationPoints(recommendation)));
    }

    // G: APPROXIMATE prefers the closer trail and excludes neither.
    @Test
    void approximateDurationRanksATrailNearTheTargetAboveAShortOne() {
        List<ScoredTrailRecommendation> result =
                scoringService.scoreTopTrails(
                        List.of(
                                candidateWithDuration("60 min", 60, 10.0),
                                candidateWithDuration("240 min", 240, 10.0)
                        ),
                        durationIntent(DurationMode.APPROXIMATE, 240),
                        50.0
                );

        assertEquals(2, result.size());
        assertEquals("240 min", result.get(0).trail().name());
        assertEquals("60 min", result.get(1).trail().name());
        assertEquals(10, durationPoints(result.get(0)));
        assertEquals(0, durationPoints(result.get(1)));
        assertEquals(10, result.get(0).score() - result.get(1).score());
    }

    // G: the curve. Full points within ±15 %, linear to 0 at ±75 %.
    @Test
    void approximateDurationCurvePoints() {
        int[][] expected = {
                {240, 10},
                {204, 10},
                {276, 10},
                {180, 8},
                {300, 8},
                {120, 4},
                {360, 4},
                {405, 1},
                {60, 0},
                {420, 0},
                {600, 0}
        };

        for (int[] point : expected) {
            List<ScoredTrailRecommendation> result =
                    scoringService.scoreTopTrails(
                            List.of(candidateWithDuration(
                                    "trail", point[0], 10.0)),
                            durationIntent(DurationMode.APPROXIMATE, 240),
                            50.0
                    );

            assertEquals(1, result.size(), "never excluded: " + point[0]);
            assertEquals(
                    point[1],
                    durationPoints(result.getFirst()),
                    "duration points for " + point[0] + " min"
            );
        }
    }

    // A trail with unknown duration is not excluded and scores 0 duration points.
    @Test
    void unknownTrailDurationIsKeptWithZeroDurationPoints() {
        for (DurationMode mode : DurationMode.values()) {
            List<ScoredTrailRecommendation> result =
                    scoringService.scoreTopTrails(
                            List.of(candidateWithDuration(
                                    "unknown", null, 10.0)),
                            durationIntent(mode, 240),
                            50.0
                    );

            assertEquals(1, result.size(), mode.name());
            assertEquals(0, durationPoints(result.getFirst()), mode.name());
        }
    }

    @Test
    void noDurationPreferenceKeepsFullDurationPoints() {
        List<ScoredTrailRecommendation> result =
                scoringService.scoreTopTrails(
                        List.of(candidateWithDuration("405 min", 405, 10.0)),
                        durationIntent(null, null),
                        50.0
                );

        assertEquals(1, result.size());
        assertEquals(10, durationPoints(result.getFirst()));
    }

    /**
     * Only duration varies: no difficulty, distance, elevation, or scenery
     * preference, so those intent points are always 20 + 15 + 10.
     */
    private RecommendationIntent durationIntent(
            DurationMode mode,
            Integer durationMin
    ) {
        return new RecommendationIntent(
                null,
                null,
                null,
                durationMin,
                mode,
                List.of()
        );
    }

    private int durationPoints(ScoredTrailRecommendation recommendation) {
        return recommendation.breakdown().intent() - 20 - 15 - 10;
    }

    private Set<String> names(List<ScoredTrailRecommendation> result) {
        return result.stream()
                .map(recommendation -> recommendation.trail().name())
                .collect(Collectors.toSet());
    }

    private TrailCandidateContext candidateWithDuration(
            String name,
            Integer estimatedDurationMin,
            double distanceFromUserKm
    ) {
        NearbyTrailResponse trail = new NearbyTrailResponse(
                new TrailSummaryResponse(
                        UUID.randomUUID(),
                        name,
                        "Test trail",
                        "MODERATE",
                        5.0,
                        200,
                        estimatedDurationMin,
                        49.2827,
                        -123.1207,
                        "TEST",
                        Set.of("FOREST"),
                        null,
                        Set.of(GearCategory.FOOTWEAR)
                ),
                distanceFromUserKm
        );

        return new TrailCandidateContext(
                trail,
                GOOD_WEATHER,
                Set.of(SceneryType.FOREST),
                List.of(GearCategory.FOOTWEAR),
                List.of(GearCategory.FOOTWEAR)
        );
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
                DurationMode.MAXIMUM,
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
