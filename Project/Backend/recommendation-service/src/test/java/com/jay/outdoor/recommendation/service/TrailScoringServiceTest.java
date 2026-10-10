package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TrailScoringServiceTest {

    private TrailScoringService scoringService;

    @BeforeEach
    void setUp() {
        scoringService =
                new TrailScoringService();
    }

    @Test
    void shouldScoreLakeTrailHigherWhenUserPrefersLake() {

        RecommendationIntent intent =
                new RecommendationIntent(
                        TrailDifficulty.MODERATE,
                        10.0,
                        500,
                        180,
                        List.of(
                                SceneryType.LAKE
                        )
                );

        TrailWeather goodWeather =
                new TrailWeather(
                        12.0,
                        10.0,
                        10.0
                );

        NearbyTrailResponse lakeTrail =
                createTrail(
                        "Lake Trail",
                        Set.of("LAKE")
                );

        NearbyTrailResponse viewpointTrail =
                createTrail(
                        "Viewpoint Trail",
                        Set.of("VIEWPOINT")
                );

        TrailCandidateContext lakeContext =
                new TrailCandidateContext(
                        lakeTrail,
                        goodWeather,
                        Set.of(
                                SceneryType.LAKE
                        ),
                        List.of(
                                "Footwear"
                        ),
                        List.of(
                                "Footwear"
                        )
                );

        TrailCandidateContext viewpointContext =
                new TrailCandidateContext(
                        viewpointTrail,
                        goodWeather,
                        Set.of(
                                SceneryType.VIEWPOINT
                        ),
                        List.of(
                                "Footwear"
                        ),
                        List.of(
                                "Footwear"
                        )
                );

        List<ScoredTrailRecommendation> result =
                scoringService.scoreTopTrails(
                        List.of(
                                viewpointContext,
                                lakeContext
                        ),
                        intent,
                        50.0
                );

        assertEquals(
                2,
                result.size()
        );

        assertEquals(
                "Lake Trail",
                result.getFirst()
                        .trail()
                        .name()
        );

        assertEquals(
                10,
                result.getFirst()
                        .breakdown()
                        .scenery()
        );

        assertEquals(
                0,
                result.get(1)
                        .breakdown()
                        .scenery()
        );

        assertTrue(
                result.getFirst().score()
                        > result.get(1).score()
        );

        assertEquals(
                10,
                result.getFirst().score()
                        - result.get(1).score()
        );
    }

    private NearbyTrailResponse createTrail(
            String name,
            Set<String> scenery
    ) {

        return new NearbyTrailResponse(
                UUID.randomUUID(),
                name,
                "Test trail",
                "MODERATE",
                5.0,
                200,
                120,
                49.2827,
                -123.1207,
                "TEST",
                10.0,
                scenery
        );
    }
}