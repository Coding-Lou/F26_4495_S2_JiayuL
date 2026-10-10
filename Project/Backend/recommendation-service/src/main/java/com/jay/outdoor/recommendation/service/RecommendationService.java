package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse;
import com.jay.outdoor.recommendation.client.trail.TrailServiceClient;
import com.jay.outdoor.recommendation.client.user.GearResponse;
import com.jay.outdoor.recommendation.client.user.UserServiceClient;
import com.jay.outdoor.recommendation.client.weather.WeatherServiceClient;
import com.jay.outdoor.recommendation.dto.RecommendationIntent;
import com.jay.outdoor.recommendation.dto.RecommendationQueryRequest;
import com.jay.outdoor.recommendation.dto.RecommendationRequest;
import com.jay.outdoor.recommendation.dto.RecommendationResponse;
import com.jay.outdoor.recommendation.dto.SceneryType;
import com.jay.outdoor.recommendation.dto.ScoredTrailRecommendation;
import com.jay.outdoor.recommendation.dto.TrailCandidateContext;
import com.jay.outdoor.recommendation.dto.TrailWeather;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    private static final double DEFAULT_RADIUS_KM = 50.0;

    private final TrailServiceClient trailServiceClient;
    private final UserServiceClient userServiceClient;
    private final WeatherServiceClient weatherServiceClient;
    private final RecommendationIntentService intentService;
    private final TrailScoringService trailScoringService;
    private final GearRequirementService gearRequirementService;

    public RecommendationService(
            TrailServiceClient trailServiceClient,
            UserServiceClient userServiceClient,
            RecommendationIntentService intentService,
            TrailScoringService trailScoringService,
            WeatherServiceClient weatherServiceClient,
            GearRequirementService gearRequirementService
    ) {
        this.trailServiceClient = trailServiceClient;
        this.userServiceClient = userServiceClient;
        this.intentService = intentService;
        this.trailScoringService = trailScoringService;
        this.weatherServiceClient = weatherServiceClient;
        this.gearRequirementService = gearRequirementService;
    }

    public RecommendationResponse recommendFromQuery(
            RecommendationQueryRequest request,
            String accessToken
    ) {

        RecommendationIntent intent =
                intentService.extractIntent(
                        request.message()
                );

        double radiusKm =
                request.radiusKm() != null
                        ? request.radiusKm()
                        : 50.0;

        List<NearbyTrailResponse> nearbyTrails =
                trailServiceClient.getNearbyTrails(
                        request.latitude(),
                        request.longitude(),
                        radiusKm,
                        accessToken
                );

        List<GearResponse> userGear =
                userServiceClient.getCurrentUserGear(
                        accessToken
                );

        List<String> ownedGearCategories =
                userGear.stream()
                        .map(GearResponse::category)
                        .filter(Objects::nonNull)
                        .toList();

        List<TrailCandidateContext> candidateContexts =
                nearbyTrails.stream()
                        .map(trail ->
                                buildCandidateContext(
                                        trail,
                                        request,
                                        ownedGearCategories
                                )
                        )
                        .toList();

        List<ScoredTrailRecommendation> recommendations =
                trailScoringService.scoreTopTrails(
                        candidateContexts,
                        intent,
                        radiusKm
                );

        return new RecommendationResponse(
                recommendations
        );
    }

    private TrailCandidateContext buildCandidateContext(
            NearbyTrailResponse trail,
            RecommendationQueryRequest request,
            List<String> ownedGearCategories
    ) {

        TrailWeather weather =
                weatherServiceClient.getWeather(
                        trail.latitude(),
                        trail.longitude(),
                        request.tripDate()
                );

        List<String> requiredGearCategories =
                gearRequirementService.determineRequiredGear(
                        trail,
                        weather
                );

        Set<SceneryType> scenery =
                mapScenery(
                        trail.scenery()
                );

        return new TrailCandidateContext(
                trail,
                weather,
                scenery,
                requiredGearCategories,
                ownedGearCategories
        );
    }

    private <T> List<T> safeList(List<T> values) {
        return values == null ? List.of() : values;
    }

    public List<NearbyTrailResponse> recommendTrails(
            RecommendationRequest request,
            String accessToken
    ) {
        return safeList(
                trailServiceClient.getNearbyTrails(
                        request.latitude(),
                        request.longitude(),
                        request.radiusKm(),
                        accessToken
                )
        ).stream()
                .filter(trail -> trail != null)
                .filter(trail -> matchesDifficulty(trail, request))
                .filter(trail -> matchesDistance(trail, request))
                .filter(trail -> matchesElevation(trail, request))
                .toList();
    }

    private boolean matchesDifficulty(
            NearbyTrailResponse trail,
            RecommendationRequest request
    ) {
        if (request.difficulty() == null
                || request.difficulty().isBlank()) {
            return true;
        }

        return trail.difficulty() != null
                && trail.difficulty().equalsIgnoreCase(request.difficulty());
    }

    private boolean matchesDistance(
            NearbyTrailResponse trail,
            RecommendationRequest request
    ) {
        if (request.maxDistanceKm() == null) {
            return true;
        }

        return trail.distanceKm() != null
                && trail.distanceKm() <= request.maxDistanceKm();
    }

    private boolean matchesElevation(
            NearbyTrailResponse trail,
            RecommendationRequest request
    ) {
        if (request.maxElevationGainM() == null) {
            return true;
        }

        return trail.elevationGainM() != null
                && trail.elevationGainM() <= request.maxElevationGainM();
    }

    private Set<SceneryType> mapScenery(
            Set<String> scenery
    ) {

        if (scenery == null
                || scenery.isEmpty()) {

            return Set.of();
        }

        return scenery.stream()
                .map(String::trim)
                .map(String::toUpperCase)
                .map(this::toSceneryType)
                .flatMap(Optional::stream)
                .collect(Collectors.toSet());
    }

    private Optional<SceneryType> toSceneryType(
            String value
    ) {

        try {

            return Optional.of(
                    SceneryType.valueOf(value)
            );

        } catch (IllegalArgumentException e) {

            return Optional.empty();
        }
    }
}
