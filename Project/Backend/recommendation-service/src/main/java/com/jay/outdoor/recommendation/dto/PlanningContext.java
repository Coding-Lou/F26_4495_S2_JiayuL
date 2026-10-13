package com.jay.outdoor.recommendation.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.List;

public record PlanningContext(

        TrailDifficulty difficulty,

        @Positive(message = "maxDistanceKm must be greater than 0")
        Double maxDistanceKm,

        @PositiveOrZero(message = "maxElevationGainM must be greater than or equal to 0")
        Integer maxElevationGainM,

        @Positive(message = "maxDurationMin must be greater than 0")
        Integer maxDurationMin,

        List<@NotNull SceneryType> preferredScenery

) {
    public PlanningContext {
        preferredScenery = preferredScenery == null
                ? List.of()
                : List.copyOf(preferredScenery);
    }

    public static PlanningContext empty() {
        return new PlanningContext(
                null,
                null,
                null,
                null,
                List.of()
        );
    }

    public RecommendationIntent toRecommendationIntent() {
        return new RecommendationIntent(
                difficulty,
                maxDistanceKm,
                maxElevationGainM,
                maxDurationMin,
                preferredScenery
        );
    }
}
