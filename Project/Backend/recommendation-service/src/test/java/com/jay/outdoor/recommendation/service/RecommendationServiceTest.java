package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse;
import com.jay.outdoor.recommendation.client.trail.TrailSummaryResponse;
import com.jay.outdoor.recommendation.client.trail.TrailServiceClient;
import com.jay.outdoor.recommendation.client.user.GearResponse;
import com.jay.outdoor.recommendation.client.user.UserServiceClient;
import com.jay.outdoor.recommendation.client.weather.WeatherServiceClient;
import com.jay.outdoor.recommendation.dto.RecommendationIntent;
import com.jay.outdoor.recommendation.dto.RecommendationQueryRequest;
import com.jay.outdoor.recommendation.dto.RecommendationRequest;
import com.jay.outdoor.recommendation.dto.RecommendationResponse;
import com.jay.outdoor.recommendation.dto.GearCategory;
import com.jay.outdoor.recommendation.dto.SceneryType;
import com.jay.outdoor.recommendation.dto.TrailDifficulty;
import com.jay.outdoor.recommendation.dto.TrailWeather;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RecommendationServiceTest {

    private static final TrailWeather GOOD_WEATHER =
            new TrailWeather(12.0, 10.0, 10.0);

    private TrailServiceClient trailServiceClient;
    private UserServiceClient userServiceClient;
    private RecommendationIntentService intentService;
    private TrailScoringService trailScoringService;
    private WeatherServiceClient weatherServiceClient;
    private GearRequirementService gearRequirementService;

    private RecommendationService recommendationService;

    @BeforeEach
    void setUp() {

        trailServiceClient =
                mock(TrailServiceClient.class);

        userServiceClient =
                mock(UserServiceClient.class);

        intentService =
                mock(RecommendationIntentService.class);

        trailScoringService =
                new TrailScoringService();

        weatherServiceClient =
                mock(WeatherServiceClient.class);

        gearRequirementService =
                new GearRequirementService();

        recommendationService =
                new RecommendationService(
                        trailServiceClient,
                        userServiceClient,
                        intentService,
                        trailScoringService,
                        weatherServiceClient,
                        gearRequirementService
                );
    }

    @Test
    void shouldReturnMatchingTrails() {

        String accessToken = "test-token";

        RecommendationRequest request =
                new RecommendationRequest(
                        49.2827,
                        -123.1207,
                        50,
                        "MODERATE",
                        10.0,
                        500
                );

        NearbyTrailResponse quarryRock =
                createTrail(
                        "Quarry Rock",
                        "MODERATE",
                        5.8,
                        220,
                        120,
                        18.5,
                        Set.of(
                                "FOREST",
                                "VIEWPOINT"
                        )
                );

        NearbyTrailResponse grouseGrind =
                createTrail(
                        "Grouse Grind",
                        "HARD",
                        2.5,
                        800,
                        120,
                        12.0,
                        Set.of(
                                "MOUNTAIN",
                                "VIEWPOINT"
                        )
                );

        when(
                trailServiceClient.getNearbyTrails(
                        49.2827,
                        -123.1207,
                        50,
                        accessToken
                )
        ).thenReturn(
                List.of(
                        quarryRock,
                        grouseGrind
                )
        );

        List<NearbyTrailResponse> result =
                recommendationService.recommendTrails(
                        request,
                        accessToken
                );

        assertEquals(
                1,
                result.size()
        );

        assertEquals(
                "Quarry Rock",
                result.getFirst()
                        .trail()
                        .name()
        );
    }

    @Test
    void shouldReturnAllNearbyTrailsWhenNoFiltersProvided() {

        String accessToken = "test-token";

        RecommendationRequest request =
                new RecommendationRequest(
                        49.2827,
                        -123.1207,
                        50,
                        null,
                        null,
                        null
                );

        NearbyTrailResponse quarryRock =
                createTrail(
                        "Quarry Rock",
                        "MODERATE",
                        5.8,
                        220,
                        120,
                        18.5,
                        Set.of(
                                "FOREST",
                                "VIEWPOINT"
                        )
                );

        NearbyTrailResponse grouseGrind =
                createTrail(
                        "Grouse Grind",
                        "HARD",
                        2.5,
                        800,
                        120,
                        12.0,
                        Set.of(
                                "MOUNTAIN",
                                "VIEWPOINT"
                        )
                );

        when(
                trailServiceClient.getNearbyTrails(
                        49.2827,
                        -123.1207,
                        50,
                        accessToken
                )
        ).thenReturn(
                List.of(
                        quarryRock,
                        grouseGrind
                )
        );

        List<NearbyTrailResponse> result =
                recommendationService.recommendTrails(
                        request,
                        accessToken
                );

        assertEquals(
                2,
                result.size()
        );
    }

    @Test
    void shouldReturnEmptyListWhenNoNearbyTrailsFound() {

        String accessToken = "test-token";

        RecommendationRequest request =
                new RecommendationRequest(
                        49.2827,
                        -123.1207,
                        20,
                        "MODERATE",
                        10.0,
                        500
                );

        when(
                trailServiceClient.getNearbyTrails(
                        49.2827,
                        -123.1207,
                        20,
                        accessToken
                )
        ).thenReturn(
                List.of()
        );

        List<NearbyTrailResponse> result =
                recommendationService.recommendTrails(
                        request,
                        accessToken
                );

        assertTrue(
                result.isEmpty()
        );
    }

    @Test
    void shouldRecommendTrailsFromNaturalLanguageQuery() {

        String accessToken = "test-token";

        RecommendationQueryRequest request =
                new RecommendationQueryRequest(
                        "I want a moderate hike under three hours.",
                        49.2827,
                        -123.1207,
                        LocalDate.of(2026, 10, 17),
                        50.0
                );

        RecommendationIntent intent =
                new RecommendationIntent(
                        TrailDifficulty.MODERATE,
                        10.0,
                        500,
                        180,
                        List.of()
                );

        NearbyTrailResponse quarryRock =
                createTrail(
                        "Quarry Rock",
                        "MODERATE",
                        5.8,
                        220,
                        120,
                        18.5,
                        Set.of(
                                "FOREST",
                                "VIEWPOINT"
                        )
                );

        NearbyTrailResponse grouseGrind =
                createTrail(
                        "Grouse Grind",
                        "HARD",
                        2.5,
                        800,
                        120,
                        12.0,
                        Set.of(
                                "MOUNTAIN",
                                "VIEWPOINT"
                        )
                );

        GearResponse hikingBoots =
                new GearResponse(
                        UUID.randomUUID(),
                        "Hiking Boots",
                        GearCategory.FOOTWEAR,
                        "Waterproof hiking boots",
                        OffsetDateTime.now()
                );

        when(
                intentService.extractIntent(
                        request.message()
                )
        ).thenReturn(intent);

        when(
                trailServiceClient.getNearbyTrails(
                        49.2827,
                        -123.1207,
                        50.0,
                        accessToken
                )
        ).thenReturn(
                List.of(
                        quarryRock,
                        grouseGrind
                )
        );

        when(
                userServiceClient.getCurrentUserGear(
                        accessToken
                )
        ).thenReturn(
                List.of(hikingBoots)
        );

        when(
                weatherServiceClient.getWeather(
                        49.2827,
                        -123.1207,
                        request.tripDate()
                )
        ).thenReturn(
                new TrailWeather(
                        12,
                        10,
                        10
                )
        );

        RecommendationResponse result =
                recommendationService.recommendFromQuery(
                        request,
                        accessToken
                );

        assertEquals(
                1,
                result.recommendations().size()
        );

        assertEquals(
                "Quarry Rock",
                result.recommendations()
                        .getFirst()
                        .trail()
                        .name()
        );

        assertEquals(
                91,
                result.recommendations()
                        .getFirst()
                        .score()
        );
    }

    @Test
    void shouldUseCandidateSceneryMetadataForQueryEligibility() {
        String accessToken = "test-token";
        LocalDate tripDate = LocalDate.of(2026, 10, 17);
        RecommendationQueryRequest request =
                new RecommendationQueryRequest(
                        "I want a moderate lake hike.",
                        49.2827,
                        -123.1207,
                        tripDate,
                        50.0
                );
        RecommendationIntent intent =
                new RecommendationIntent(
                        TrailDifficulty.MODERATE,
                        null,
                        null,
                        null,
                        List.of(SceneryType.LAKE)
                );
        NearbyTrailResponse nearbyViewpoint = createTrail(
                "Nearby Viewpoint",
                "MODERATE",
                5.0,
                100,
                90,
                1.0,
                Set.of("VIEWPOINT")
        );
        NearbyTrailResponse distantLake = createTrail(
                "Distant Lake",
                "MODERATE",
                5.0,
                100,
                90,
                49.0,
                Set.of("LAKE")
        );

        when(intentService.extractIntent(request.message()))
                .thenReturn(intent);
        when(trailServiceClient.getNearbyTrails(
                49.2827,
                -123.1207,
                50.0,
                accessToken
        )).thenReturn(List.of(nearbyViewpoint, distantLake));
        when(userServiceClient.getCurrentUserGear(accessToken))
                .thenReturn(List.of());
        when(weatherServiceClient.getWeather(
                49.2827,
                -123.1207,
                tripDate
        )).thenReturn(GOOD_WEATHER);

        RecommendationResponse result =
                recommendationService.recommendFromQuery(
                        request,
                        accessToken
                );

        assertEquals(1, result.recommendations().size());
        assertEquals(
                "Distant Lake",
                result.recommendations().getFirst().trail().name()
        );
    }

    private NearbyTrailResponse createTrail(
            String name,
            String difficulty,
            double distanceKm,
            int elevationGainM,
            int estimatedDurationMin,
            double distanceFromUserKm,
            Set<String> scenery
    ) {

        return new NearbyTrailResponse(
                new TrailSummaryResponse(
                        UUID.randomUUID(),
                        name,
                        "Test trail",
                        difficulty,
                        distanceKm,
                        elevationGainM,
                        estimatedDurationMin,
                        49.2827,
                        -123.1207,
                        "TEST",
                        scenery,
                        "https://example.com/" + name + ".jpg",
                        Set.of(
                                GearCategory.FOOTWEAR,
                                GearCategory.WATER
                        )
                ),
                distanceFromUserKm
        );
    }


}
