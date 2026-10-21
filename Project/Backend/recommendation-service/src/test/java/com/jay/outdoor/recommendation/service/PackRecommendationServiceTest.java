package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.client.trail.TrailServiceClient;
import com.jay.outdoor.recommendation.client.trail.TrailSummaryResponse;
import com.jay.outdoor.recommendation.client.user.GearResponse;
import com.jay.outdoor.recommendation.client.user.UserServiceClient;
import com.jay.outdoor.recommendation.client.weather.WeatherServiceClient;
import com.jay.outdoor.recommendation.dto.*;
import com.jay.outdoor.recommendation.exception.TrailNotFoundException;
import com.jay.outdoor.recommendation.exception.UserServiceUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PackRecommendationServiceTest {

    private TrailServiceClient trailServiceClient;
    private UserServiceClient userServiceClient;
    private WeatherServiceClient weatherServiceClient;

    private PackRecommendationService packRecommendationService;

    @BeforeEach
    void setUp() {

        trailServiceClient =
                mock(TrailServiceClient.class);

        userServiceClient =
                mock(UserServiceClient.class);

        weatherServiceClient =
                mock(WeatherServiceClient.class);

        GearRequirementService gearRequirementService =
                new GearRequirementService();

        packRecommendationService =
                new PackRecommendationService(
                        trailServiceClient,
                        userServiceClient,
                        weatherServiceClient,
                        gearRequirementService
                );
    }

    @Test
    void shouldReturnOwnedAndMissingGearForSelectedTrail() {

        String accessToken = "test-token";
        UUID trailId = UUID.randomUUID();
        LocalDate tripDate =
                LocalDate.of(2026, 10, 17);

        TrailSummaryResponse trail =
                new TrailSummaryResponse(
                        trailId,
                        "Garibaldi Lake",
                        "Test trail",
                        "HARD",
                        18.0,
                        820,
                        360,
                        49.95,
                        -123.05,
                        "TEST",
                        Set.of(
                                "LAKE",
                                "MOUNTAIN",
                                "FOREST"
                        ),
                        "https://example.com/garibaldi-lake.jpg",
                        Set.of(
                                GearCategory.FOOTWEAR,
                                GearCategory.WATER,
                                GearCategory.FOOD,
                                GearCategory.BACKPACK
                        )
                );

        TrailWeather weather =
                new TrailWeather(
                        4.0,
                        70.0,
                        20.0
                );

        GearResponse boots =
                new GearResponse(
                        UUID.randomUUID(),
                        "Hiking Boots",
                        GearCategory.FOOTWEAR,
                        "Waterproof boots",
                        OffsetDateTime.now()
                );

        GearResponse backpack =
                new GearResponse(
                        UUID.randomUUID(),
                        "Day Backpack",
                        GearCategory.BACKPACK,
                        "25L backpack",
                        OffsetDateTime.now()
                );

        when(
                trailServiceClient.getTrailById(
                        trailId,
                        accessToken
                )
        ).thenReturn(trail);

        when(
                weatherServiceClient.getWeather(
                        trail.latitude(),
                        trail.longitude(),
                        tripDate
                )
        ).thenReturn(weather);

        when(
                userServiceClient.getCurrentUserGear(
                        accessToken
                )
        ).thenReturn(
                List.of(
                        boots,
                        backpack
                )
        );

        PackRecommendationRequest request =
                new PackRecommendationRequest(
                        trailId,
                        tripDate
                );

        PackRecommendationResponse result =
                packRecommendationService
                        .getPackRecommendation(
                                request,
                                accessToken
                        );

        assertEquals(
                trailId,
                result.trailId()
        );

        assertEquals(
                "Garibaldi Lake",
                result.trailName()
        );

        assertEquals(
                weather,
                result.weather()
        );

        assertTrue(
                hasGear(
                        result,
                        GearCategory.FOOTWEAR,
                        true
                )
        );

        assertTrue(
                hasGear(
                        result,
                        GearCategory.BACKPACK,
                        true
                )
        );

        assertTrue(
                hasGear(
                        result,
                        GearCategory.WATER,
                        false
                )
        );

        assertTrue(
                hasGear(
                        result,
                        GearCategory.FOOD,
                        false
                )
        );

        // Added dynamically because:
        // precipitation = 70%
        assertTrue(
                hasGear(
                        result,
                        GearCategory.RAIN_GEAR,
                        false
                )
        );

        // Added dynamically because:
        // temperature = 4°C
        assertTrue(
                hasGear(
                        result,
                        GearCategory.WARM_LAYER,
                        false
                )
        );

        assertEquals(
                33,
                result.readinessPercentage()
        );
    }

    @Test
    void shouldStopWhenTrailDoesNotExist() {

        String accessToken = "test-token";
        UUID trailId = UUID.randomUUID();
        LocalDate tripDate = LocalDate.now().plusDays(7);

        PackRecommendationRequest request =
                new PackRecommendationRequest(
                        trailId,
                        tripDate
                );

        when(
                trailServiceClient.getTrailById(
                        trailId,
                        accessToken
                )
        ).thenThrow(
                new TrailNotFoundException(trailId)
        );

        assertThrows(
                TrailNotFoundException.class,
                () -> packRecommendationService
                        .getPackRecommendation(
                                request,
                                accessToken
                        )
        );

        verifyNoInteractions(
                weatherServiceClient,
                userServiceClient
        );
    }

    @Test
    void shouldReturnBaselineGearWhenWeatherServiceFails() {

        String accessToken = "test-token";
        UUID trailId = UUID.randomUUID();
        LocalDate tripDate = LocalDate.now().plusDays(7);

        TrailSummaryResponse trail =
                new TrailSummaryResponse(
                        trailId,
                        "Garibaldi Lake",
                        "Test trail",
                        "HARD",
                        18.0,
                        820,
                        360,
                        49.95,
                        -123.05,
                        "TEST",
                        Set.of(
                                "LAKE",
                                "MOUNTAIN"
                        ),
                        "https://example.com/garibaldi-lake.jpg",
                        Set.of(
                                GearCategory.FOOTWEAR,
                                GearCategory.WATER,
                                GearCategory.FOOD,
                                GearCategory.BACKPACK
                        )
                );

        GearResponse boots =
                new GearResponse(
                        UUID.randomUUID(),
                        "Hiking Boots",
                        GearCategory.FOOTWEAR,
                        "Waterproof boots",
                        OffsetDateTime.now()
                );

        when(
                trailServiceClient.getTrailById(
                        trailId,
                        accessToken
                )
        ).thenReturn(trail);

        when(
                weatherServiceClient.getWeather(
                        trail.latitude(),
                        trail.longitude(),
                        tripDate
                )
        ).thenThrow(
                new RuntimeException("Weather API unavailable")
        );

        when(
                userServiceClient.getCurrentUserGear(
                        accessToken
                )
        ).thenReturn(
                List.of(boots)
        );

        PackRecommendationRequest request =
                new PackRecommendationRequest(
                        trailId,
                        tripDate
                );

        PackRecommendationResponse result =
                packRecommendationService
                        .getPackRecommendation(
                                request,
                                accessToken
                        );

        assertFalse(
                result.weatherAvailable()
        );

        assertNull(
                result.weather()
        );

        assertTrue(
                hasGear(
                        result,
                        GearCategory.FOOTWEAR,
                        true
                )
        );

        assertTrue(
                hasGear(
                        result,
                        GearCategory.WATER,
                        false
                )
        );

        assertTrue(
                hasGear(
                        result,
                        GearCategory.FOOD,
                        false
                )
        );

        assertTrue(
                hasGear(
                        result,
                        GearCategory.BACKPACK,
                        false
                )
        );

        assertFalse(
                result.requiredGear()
                        .stream()
                        .anyMatch(item ->
                                item.category()
                                        == GearCategory.RAIN_GEAR
                        )
        );

        assertEquals(25, result.readinessPercentage());
    }

    @Test
    void shouldUseBaselineGearAndOwnershipOnMildWeather() {
        String accessToken = "test-token";
        UUID trailId = UUID.randomUUID();
        LocalDate tripDate = LocalDate.now().plusDays(3);
        TrailSummaryResponse trail = trailWithBaseline(
                trailId,
                Set.of(
                        GearCategory.FOOTWEAR,
                        GearCategory.WATER
                )
        );
        TrailWeather mildWeather = new TrailWeather(
                15.0,
                10.0,
                10.0
        );
        GearResponse boots = new GearResponse(
                UUID.randomUUID(),
                "Hiking Boots",
                GearCategory.FOOTWEAR,
                null,
                OffsetDateTime.now()
        );

        when(trailServiceClient.getTrailById(trailId, accessToken))
                .thenReturn(trail);
        when(weatherServiceClient.getWeather(
                trail.latitude(),
                trail.longitude(),
                tripDate
        )).thenReturn(mildWeather);
        when(userServiceClient.getCurrentUserGear(accessToken))
                .thenReturn(List.of(boots));

        PackRecommendationResponse result =
                packRecommendationService.getPackRecommendation(
                        new PackRecommendationRequest(trailId, tripDate),
                        accessToken
                );

        assertEquals(trailId, result.trailId());
        assertEquals("Quarry Rock", result.trailName());
        assertEquals(mildWeather, result.weather());
        assertTrue(result.weatherAvailable());
        assertEquals(2, result.requiredGear().size());
        assertTrue(hasGear(result, GearCategory.FOOTWEAR, true));
        assertTrue(hasGear(result, GearCategory.WATER, false));
        assertEquals(50, result.readinessPercentage());
    }

    @Test
    void shouldNotDuplicateCategoryRequiredByTrailAndWeather() {
        String accessToken = "test-token";
        UUID trailId = UUID.randomUUID();
        LocalDate tripDate = LocalDate.now().plusDays(3);
        TrailSummaryResponse trail = trailWithBaseline(
                trailId,
                Set.of(
                        GearCategory.RAIN_GEAR,
                        GearCategory.WATER
                )
        );
        TrailWeather rainyWeather = new TrailWeather(
                15.0,
                70.0,
                10.0
        );

        when(trailServiceClient.getTrailById(trailId, accessToken))
                .thenReturn(trail);
        when(weatherServiceClient.getWeather(
                trail.latitude(),
                trail.longitude(),
                tripDate
        )).thenReturn(rainyWeather);
        when(userServiceClient.getCurrentUserGear(accessToken))
                .thenReturn(List.of());

        PackRecommendationResponse result =
                packRecommendationService.getPackRecommendation(
                        new PackRecommendationRequest(trailId, tripDate),
                        accessToken
                );

        assertEquals(2, result.requiredGear().size());
        assertEquals(
                1,
                result.requiredGear().stream()
                        .filter(item ->
                                item.category() == GearCategory.RAIN_GEAR
                        )
                        .count()
        );
        assertEquals(0, result.readinessPercentage());
    }

    @Test
    void shouldFailWhenUserServiceIsUnavailable() {

        String accessToken = "test-token";
        UUID trailId = UUID.randomUUID();
        LocalDate tripDate = LocalDate.now().plusDays(7);

        TrailSummaryResponse trail =
                new TrailSummaryResponse(
                        trailId,
                        "Garibaldi Lake",
                        "Test trail",
                        "HARD",
                        18.0,
                        820,
                        360,
                        49.95,
                        -123.05,
                        "TEST",
                        Set.of(
                                "LAKE",
                                "MOUNTAIN"
                        ),
                        "https://example.com/garibaldi-lake.jpg",
                        Set.of(
                                GearCategory.FOOTWEAR,
                                GearCategory.WATER,
                                GearCategory.FOOD,
                                GearCategory.BACKPACK
                        )
                );

        TrailWeather weather =
                new TrailWeather(
                        8.0,
                        20.0,
                        15.0
                );

        PackRecommendationRequest request =
                new PackRecommendationRequest(
                        trailId,
                        tripDate
                );

        when(
                trailServiceClient.getTrailById(
                        trailId,
                        accessToken
                )
        ).thenReturn(trail);

        when(
                weatherServiceClient.getWeather(
                        trail.latitude(),
                        trail.longitude(),
                        tripDate
                )
        ).thenReturn(weather);

        when(
                userServiceClient.getCurrentUserGear(
                        accessToken
                )
        ).thenThrow(
                new UserServiceUnavailableException(
                        "User service is unavailable",
                        new RuntimeException("Connection refused")
                )
        );

        assertThrows(
                UserServiceUnavailableException.class,
                () -> packRecommendationService
                        .getPackRecommendation(
                                request,
                                accessToken
                        )
        );
    }

    private boolean hasGear(
            PackRecommendationResponse response,
            GearCategory category,
            boolean owned
    ) {

        return response.requiredGear()
                .stream()
                .anyMatch(item ->
                        item.category() == category
                                && item.owned() == owned
                );
    }

    private TrailSummaryResponse trailWithBaseline(
            UUID trailId,
            Set<GearCategory> baselineGearRequirements
    ) {
        return new TrailSummaryResponse(
                trailId,
                "Quarry Rock",
                "Forest trail",
                "MODERATE",
                5.8,
                220,
                120,
                49.3265,
                -122.9368,
                "DEMO_SEED",
                Set.of("FOREST", "VIEWPOINT"),
                null,
                baselineGearRequirements
        );
    }
}
