package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse;
import com.jay.outdoor.recommendation.client.trail.TrailServiceClient;
import com.jay.outdoor.recommendation.client.user.GearResponse;
import com.jay.outdoor.recommendation.client.user.UserServiceClient;
import com.jay.outdoor.recommendation.client.weather.WeatherServiceClient;
import com.jay.outdoor.recommendation.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    private static final Logger log =
            LoggerFactory.getLogger(RecommendationService.class);

    private static final double DEFAULT_RADIUS_KM = 50.0;

    /** At most this many weather lookups per recommendation request. */
    static final int WEATHER_SHORTLIST_SIZE = 15;

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

        return recommend(
                intent,
                request.latitude(),
                request.longitude(),
                request.tripDate(),
                request.radiusKm(),
                accessToken
        );
    }

    RecommendationResponse recommend(
            RecommendationIntent intent,
            double latitude,
            double longitude,
            LocalDate tripDate,
            Double requestedRadiusKm,
            String accessToken
    ) {

        double radiusKm =
                requestedRadiusKm != null
                        ? requestedRadiusKm
                        : DEFAULT_RADIUS_KM;

        List<NearbyTrailResponse> nearbyTrails =
                trailServiceClient.getNearbyTrails(
                        latitude,
                        longitude,
                        radiusKm,
                        accessToken
                );

        List<GearResponse> userGear =
                userServiceClient.getCurrentUserGear(
                        accessToken
                );

        List<GearCategory> ownedGearCategories =
                userGear.stream()
                        .map(GearResponse::category)
                        .filter(Objects::nonNull)
                        .toList();

        // Hard filters and every weather-free factor first; weather only for
        // the shortlist, so the lookups stay bounded as the trail count grows.
        List<TrailCandidateContext> candidatesWithoutWeather =
                nearbyTrails.stream()
                        .map(trail ->
                                buildCandidateContext(
                                        trail,
                                        null,
                                        ownedGearCategories
                                )
                        )
                        .toList();

        List<TrailCandidateContext> shortlist =
                trailScoringService.shortlistForWeather(
                        candidatesWithoutWeather,
                        intent,
                        radiusKm,
                        WEATHER_SHORTLIST_SIZE
                );

        log.info(
                "Recommendation candidates: {} nearby, {} shortlisted for weather",
                nearbyTrails.size(),
                shortlist.size()
        );

        List<TrailCandidateContext> candidateContexts =
                shortlist.stream()
                        .map(candidate ->
                                buildCandidateContext(
                                        candidate.trail(),
                                        lookUpWeather(
                                                candidate.trail(),
                                                tripDate
                                        ),
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

    /**
     * Weather is one ranking signal: a failed lookup leaves this candidate
     * without weather (scored as unavailable) instead of failing the request.
     */
    private TrailWeather lookUpWeather(
            NearbyTrailResponse trail,
            LocalDate tripDate
    ) {

        try {

            return weatherServiceClient.getWeather(
                    trail.trail().latitude(),
                    trail.trail().longitude(),
                    tripDate
            );

        } catch (RuntimeException ex) {

            log.warn(
                    "Weather unavailable for trail {} on {}; ranking it without weather: {}",
                    trail.trail().id(),
                    tripDate,
                    ex.getMessage()
            );
            return null;
        }
    }

    private TrailCandidateContext buildCandidateContext(
            NearbyTrailResponse trail,
            TrailWeather weather,
            List<GearCategory> ownedGearCategories
    ) {

        List<GearCategory> requiredGearCategories =
                gearRequirementService.determineRequiredGear(
                        trail.trail(),
                        weather
                );

        Set<SceneryType> scenery =
                mapScenery(
                        trail.trail().scenery()
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

        return trail.trail().difficulty() != null
                && trail.trail().difficulty().equalsIgnoreCase(request.difficulty());
    }

    private boolean matchesDistance(
            NearbyTrailResponse trail,
            RecommendationRequest request
    ) {
        if (request.maxDistanceKm() == null) {
            return true;
        }

        return trail.trail().distanceKm() != null
                && trail.trail().distanceKm() <= request.maxDistanceKm();
    }

    private boolean matchesElevation(
            NearbyTrailResponse trail,
            RecommendationRequest request
    ) {
        if (request.maxElevationGainM() == null) {
            return true;
        }

        return trail.trail().elevationGainM() != null
                && trail.trail().elevationGainM() <= request.maxElevationGainM();
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
