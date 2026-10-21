package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse;
import com.jay.outdoor.recommendation.client.trail.TrailSummaryResponse;
import com.jay.outdoor.recommendation.client.trail.TrailServiceClient;
import com.jay.outdoor.recommendation.client.user.GearResponse;
import com.jay.outdoor.recommendation.client.user.UserServiceClient;
import com.jay.outdoor.recommendation.client.weather.WeatherServiceClient;
import com.jay.outdoor.recommendation.dto.DurationMode;
import com.jay.outdoor.recommendation.dto.RecommendationIntent;
import com.jay.outdoor.recommendation.dto.RecommendationQueryRequest;
import com.jay.outdoor.recommendation.dto.RecommendationRequest;
import com.jay.outdoor.recommendation.dto.RecommendationResponse;
import com.jay.outdoor.recommendation.dto.GearCategory;
import com.jay.outdoor.recommendation.dto.SceneryType;
import com.jay.outdoor.recommendation.dto.TrailDifficulty;
import com.jay.outdoor.recommendation.dto.TrailWeather;
import com.jay.outdoor.recommendation.dto.ScoredTrailRecommendation;
import com.jay.outdoor.recommendation.exception.WeatherServiceUnavailableException;
import org.mockito.ArgumentCaptor;
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
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
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
                        DurationMode.MAXIMUM,
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

    @Test
    void shouldLookUpWeatherOnlyForTheHardFilteredShortlist() {
        String accessToken = "test-token";
        LocalDate tripDate = LocalDate.of(2026, 10, 17);
        RecommendationIntent intent =
                new RecommendationIntent(
                        TrailDifficulty.MODERATE,
                        10.0,
                        600,
                        240,
                        DurationMode.MAXIMUM,
                        List.of(SceneryType.LAKE)
                );

        // 40 eligible lake trails (latitude 49.x) and 60 that fail a hard
        // constraint: 30 HARD lake trails and 30 MODERATE forest-only trails
        // (latitude 50.x and 51.x). Every trail has its own coordinates.
        List<NearbyTrailResponse> nearby = new java.util.ArrayList<>();
        for (int i = 0; i < 40; i++) {
            nearby.add(createTrailAt("Lake " + i, "MODERATE",
                    49.0 + i * 0.001, i, Set.of("LAKE", "FOREST")));
        }
        for (int i = 0; i < 30; i++) {
            nearby.add(createTrailAt("Hard Lake " + i, "HARD",
                    50.0 + i * 0.001, i, Set.of("LAKE")));
            nearby.add(createTrailAt("Forest " + i, "MODERATE",
                    51.0 + i * 0.001, i, Set.of("FOREST")));
        }

        when(trailServiceClient.getNearbyTrails(
                49.2827, -123.1207, 50.0, accessToken
        )).thenReturn(nearby);
        when(userServiceClient.getCurrentUserGear(accessToken))
                .thenReturn(List.of());
        when(weatherServiceClient.getWeather(
                anyDouble(), anyDouble(), eq(tripDate)
        )).thenReturn(GOOD_WEATHER);

        RecommendationResponse result =
                recommendationService.recommend(
                        intent, 49.2827, -123.1207, tripDate, 50.0, accessToken
                );

        ArgumentCaptor<Double> latitudes =
                ArgumentCaptor.forClass(Double.class);
        verify(weatherServiceClient, times(
                RecommendationService.WEATHER_SHORTLIST_SIZE
        )).getWeather(latitudes.capture(), anyDouble(), eq(tripDate));
        assertTrue(
                latitudes.getAllValues().stream()
                        .allMatch(latitude -> latitude < 50.0),
                "weather is looked up only for hard-filtered candidates"
        );

        assertEquals(3, result.recommendations().size());
        assertTrue(result.recommendations().stream()
                .allMatch(recommendation ->
                        recommendation.trail().name().startsWith("Lake ")));
        // Equal pre-rank scores keep the nearest-first order.
        assertEquals(
                "Lake 0",
                result.recommendations().getFirst().trail().name()
        );
    }

    @Test
    void shouldKeepRankingWhenOneWeatherLookupFails() {
        String accessToken = "test-token";
        LocalDate tripDate = LocalDate.of(2026, 10, 17);
        RecommendationIntent intent =
                new RecommendationIntent(
                        TrailDifficulty.EASY,
                        null,
                        null,
                        null,
                        null,
                        List.of(SceneryType.FOREST)
                );
        NearbyTrailResponse failing = createTrailAt(
                "Failing Weather", "EASY", 49.10, 1.0, Set.of("FOREST"));
        NearbyTrailResponse second = createTrailAt(
                "Second", "EASY", 49.20, 2.0, Set.of("FOREST"));
        NearbyTrailResponse third = createTrailAt(
                "Third", "EASY", 49.30, 3.0, Set.of("FOREST", "LAKE"));

        when(trailServiceClient.getNearbyTrails(
                49.2827, -123.1207, 50.0, accessToken
        )).thenReturn(List.of(failing, second, third));
        when(userServiceClient.getCurrentUserGear(accessToken))
                .thenReturn(List.of());
        when(weatherServiceClient.getWeather(
                anyDouble(), anyDouble(), eq(tripDate)
        )).thenReturn(GOOD_WEATHER);
        when(weatherServiceClient.getWeather(49.10, -123.1207, tripDate))
                .thenThrow(new WeatherServiceUnavailableException(
                        "Weather service is unavailable"));

        RecommendationResponse result =
                recommendationService.recommend(
                        intent, 49.2827, -123.1207, tripDate, 50.0, accessToken
                );

        assertEquals(3, result.recommendations().size());
        assertEquals(
                "Second",
                result.recommendations().getFirst().trail().name()
        );
        ScoredTrailRecommendation withoutWeather =
                result.recommendations().stream()
                        .filter(recommendation -> recommendation.trail()
                                .name().equals("Failing Weather"))
                        .findFirst()
                        .orElseThrow();
        assertEquals(0, withoutWeather.breakdown().weather());
        assertEquals(
                15,
                result.recommendations().getFirst().breakdown().weather()
        );
    }

    @Test
    void shouldStillRecommendWhenEveryWeatherLookupFails() {
        String accessToken = "test-token";
        LocalDate tripDate = LocalDate.of(2026, 10, 17);
        RecommendationIntent intent =
                new RecommendationIntent(
                        TrailDifficulty.EASY, null, null, null, null, List.of()
                );

        when(trailServiceClient.getNearbyTrails(
                49.2827, -123.1207, 50.0, accessToken
        )).thenReturn(List.of(
                createTrailAt("Near", "EASY", 49.10, 1.0, Set.of("LAKE")),
                createTrailAt("Far", "EASY", 49.20, 40.0, Set.of("LAKE"))
        ));
        when(userServiceClient.getCurrentUserGear(accessToken))
                .thenReturn(List.of());
        when(weatherServiceClient.getWeather(
                anyDouble(), anyDouble(), eq(tripDate)
        )).thenThrow(new WeatherServiceUnavailableException(
                "Weather service is unavailable"));

        RecommendationResponse result =
                recommendationService.recommend(
                        intent, 49.2827, -123.1207, tripDate, 50.0, accessToken
                );

        assertEquals(2, result.recommendations().size());
        assertEquals(
                "Near",
                result.recommendations().getFirst().trail().name()
        );
        assertTrue(result.recommendations().stream()
                .allMatch(recommendation ->
                        recommendation.breakdown().weather() == 0));
    }

    // E (service level): "up to six hours" never returns a 405-minute trail,
    // and the over-limit trail gets no weather lookup.
    @Test
    void shouldNeverRecommendATrailLongerThanAMaximumDuration() {
        String accessToken = "test-token";
        LocalDate tripDate = LocalDate.now().plusDays(1);
        RecommendationIntent intent =
                new RecommendationIntent(
                        null, null, null, 360, DurationMode.MAXIMUM, List.of()
                );

        // The 405-minute trail is the nearest and would otherwise rank well.
        when(trailServiceClient.getNearbyTrails(
                49.2827, -123.1207, 50.0, accessToken
        )).thenReturn(List.of(
                createTrail("Long Ridge", "HARD", 14.0, 1200, 405, 1.0,
                        Set.of("MOUNTAIN")),
                createTrail("Six Hours", "HARD", 12.0, 1000, 360, 20.0,
                        Set.of("MOUNTAIN")),
                createTrail("Half Day", "MODERATE", 9.0, 600, 240, 30.0,
                        Set.of("FOREST"))
        ));
        when(userServiceClient.getCurrentUserGear(accessToken))
                .thenReturn(List.of());
        when(weatherServiceClient.getWeather(
                anyDouble(), anyDouble(), eq(tripDate)
        )).thenReturn(GOOD_WEATHER);

        RecommendationResponse result =
                recommendationService.recommend(
                        intent, 49.2827, -123.1207, tripDate, 50.0, accessToken
                );

        assertEquals(2, result.recommendations().size());
        assertTrue(result.recommendations().stream()
                .allMatch(recommendation ->
                        recommendation.trail().estimatedDurationMin() <= 360));
        verify(weatherServiceClient, times(2))
                .getWeather(anyDouble(), anyDouble(), eq(tripDate));
    }

    private NearbyTrailResponse createTrailAt(
            String name,
            String difficulty,
            double latitude,
            double distanceFromUserKm,
            Set<String> scenery
    ) {

        return new NearbyTrailResponse(
                new TrailSummaryResponse(
                        UUID.randomUUID(),
                        name,
                        "Test trail",
                        difficulty,
                        5.0,
                        200,
                        120,
                        latitude,
                        -123.1207,
                        "TEST",
                        scenery,
                        null,
                        Set.of(
                                GearCategory.FOOTWEAR,
                                GearCategory.WATER
                        )
                ),
                distanceFromUserKm
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
