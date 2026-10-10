package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse;
import com.jay.outdoor.recommendation.dto.*;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class TrailScoringService {

    private static final int DIFFICULTY_WEIGHT = 20;
    private static final int DISTANCE_WEIGHT = 15;
    private static final int ELEVATION_WEIGHT = 10;
    private static final int DURATION_WEIGHT = 10;

    private static final int WEATHER_WEIGHT = 15;
    private static final int GEAR_WEIGHT = 15;
    private static final int SCENERY_WEIGHT = 10;
    private static final int PROXIMITY_WEIGHT = 5;

    public List<ScoredTrailRecommendation> scoreTopTrails(
            List<TrailCandidateContext> candidates,
            RecommendationIntent intent,
            double searchRadiusKm
    ) {

        return candidates.stream()
                .map(candidate ->
                        scoreTrail(
                                candidate,
                                intent,
                                searchRadiusKm
                        )
                )
                .sorted(
                        Comparator.comparingInt(
                                ScoredTrailRecommendation::score
                        ).reversed()
                )
                .limit(3)
                .toList();
    }

    private ScoredTrailRecommendation scoreTrail(
            TrailCandidateContext candidate,
            RecommendationIntent intent,
            double searchRadiusKm
    ) {

        NearbyTrailResponse trail = candidate.trail();

        int intentScore =
                scoreIntent(trail, intent);

        int weatherScore =
                scoreWeather(candidate.weather());

        int gearScore =
                scoreGear(
                        candidate.requiredGearCategories(),
                        candidate.ownedGearCategories()
                );

        int sceneryScore =
                scoreScenery(
                        candidate.scenery(),
                        intent.preferredScenery()
                );

        int proximityScore =
                scoreProximity(
                        trail,
                        searchRadiusKm
                );

        int total =
                intentScore
                        + weatherScore
                        + gearScore
                        + sceneryScore
                        + proximityScore;

        total = clamp(total, 0, 100);

        ScoreBreakdown breakdown =
                new ScoreBreakdown(
                        intentScore,
                        weatherScore,
                        gearScore,
                        sceneryScore,
                        proximityScore
                );

        return new ScoredTrailRecommendation(
                trail,
                total,
                breakdown
        );
    }

    // ------------------------------------------------
    // Intent: 55 points
    // ------------------------------------------------

    private int scoreIntent(
            NearbyTrailResponse trail,
            RecommendationIntent intent
    ) {

        return scoreDifficulty(trail, intent)
                + scoreDistance(trail, intent)
                + scoreElevation(trail, intent)
                + scoreDuration(trail, intent);
    }

    private int scoreDifficulty(
            NearbyTrailResponse trail,
            RecommendationIntent intent
    ) {

        if (intent.difficulty() == null) {
            return DIFFICULTY_WEIGHT;
        }

        if (trail.difficulty().equalsIgnoreCase(
                intent.difficulty().name()
        )) {
            return DIFFICULTY_WEIGHT;
        }

        return 0;
    }

    private int scoreDistance(
            NearbyTrailResponse trail,
            RecommendationIntent intent
    ) {

        if (intent.maxDistanceKm() == null) {
            return DISTANCE_WEIGHT;
        }

        if (trail.distanceKm() == null) {
            return 0;
        }

        if (trail.distanceKm()
                <= intent.maxDistanceKm()) {
            return DISTANCE_WEIGHT;
        }

        double ratio =
                intent.maxDistanceKm()
                        / trail.distanceKm();

        return proportionalScore(
                DISTANCE_WEIGHT,
                ratio
        );
    }

    private int scoreElevation(
            NearbyTrailResponse trail,
            RecommendationIntent intent
    ) {

        if (intent.maxElevationGainM() == null) {
            return ELEVATION_WEIGHT;
        }

        if (trail.elevationGainM() == null) {
            return 0;
        }

        if (trail.elevationGainM()
                <= intent.maxElevationGainM()) {
            return ELEVATION_WEIGHT;
        }

        double ratio =
                (double) intent.maxElevationGainM()
                        / trail.elevationGainM();

        return proportionalScore(
                ELEVATION_WEIGHT,
                ratio
        );
    }

    private int scoreDuration(
            NearbyTrailResponse trail,
            RecommendationIntent intent
    ) {

        if (intent.maxDurationMin() == null) {
            return DURATION_WEIGHT;
        }

        if (trail.estimatedDurationMin() == null) {
            return 0;
        }

        if (trail.estimatedDurationMin()
                <= intent.maxDurationMin()) {
            return DURATION_WEIGHT;
        }

        double ratio =
                (double) intent.maxDurationMin()
                        / trail.estimatedDurationMin();

        return proportionalScore(
                DURATION_WEIGHT,
                ratio
        );
    }

    // ------------------------------------------------
    // Weather: 15 points
    // ------------------------------------------------

    private int scoreWeather(
            TrailWeather weather
    ) {

        if (weather == null) {
            return 0;
        }

        int score = WEATHER_WEIGHT;

        double rain =
                weather.precipitationProbability();

        if (rain >= 70) {
            score -= 6;
        } else if (rain >= 40) {
            score -= 3;
        }

        double wind =
                weather.windSpeedKmh();

        if (wind >= 50) {
            score -= 6;
        } else if (wind >= 30) {
            score -= 3;
        }

        double temperature =
                weather.temperatureC();

        if (temperature < -5
                || temperature > 32) {
            score -= 5;
        } else if (temperature < 5
                || temperature > 28) {
            score -= 2;
        }

        return clamp(
                score,
                0,
                WEATHER_WEIGHT
        );
    }

    // ------------------------------------------------
    // Gear: 15 points
    // ------------------------------------------------

    private int scoreGear(
            List<String> requiredGear,
            List<String> ownedGear
    ) {

        if (requiredGear == null
                || requiredGear.isEmpty()) {
            return GEAR_WEIGHT;
        }

        if (ownedGear == null
                || ownedGear.isEmpty()) {
            return 0;
        }

        Set<String> owned =
                normalizeGear(ownedGear);

        long matched =
                requiredGear.stream()
                        .map(this::normalize)
                        .filter(owned::contains)
                        .count();

        double coverage =
                (double) matched
                        / requiredGear.size();

        return proportionalScore(
                GEAR_WEIGHT,
                coverage
        );
    }

    // ------------------------------------------------
    // Scenery: 10 points
    // ------------------------------------------------

    private int scoreScenery(
            Set<SceneryType> trailScenery,
            List<SceneryType> preferences
    ) {

        if (preferences == null
                || preferences.isEmpty()) {
            return SCENERY_WEIGHT;
        }

        if (trailScenery == null
                || trailScenery.isEmpty()) {
            return 0;
        }

        long matched =
                preferences.stream()
                        .filter(trailScenery::contains)
                        .count();

        double ratio =
                (double) matched
                        / preferences.size();

        return proportionalScore(
                SCENERY_WEIGHT,
                ratio
        );
    }

    // ------------------------------------------------
    // Proximity: 5 points
    // ------------------------------------------------

    private int scoreProximity(
            NearbyTrailResponse trail,
            double searchRadiusKm
    ) {

        if (trail.distanceFromUserKm() == null
                || searchRadiusKm <= 0) {
            return 0;
        }

        double ratio =
                1.0
                        - (
                        trail.distanceFromUserKm()
                                / searchRadiusKm
                );

        return proportionalScore(
                PROXIMITY_WEIGHT,
                ratio
        );
    }

    // ------------------------------------------------
    // Helpers
    // ------------------------------------------------

    private int proportionalScore(
            int weight,
            double ratio
    ) {

        ratio =
                Math.max(
                        0.0,
                        Math.min(1.0, ratio)
                );

        return (int) Math.round(
                weight * ratio
        );
    }

    private Set<String> normalizeGear(
            List<String> gear
    ) {

        Set<String> normalized =
                new HashSet<>();

        for (String item : gear) {
            normalized.add(
                    normalize(item)
            );
        }

        return normalized;
    }

    private String normalize(
            String value
    ) {

        return value
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private int clamp(
            int value,
            int min,
            int max
    ) {

        return Math.max(
                min,
                Math.min(max, value)
        );
    }
}