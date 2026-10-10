package com.jay.outdoor.recommendation.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record RecommendationRequest(

        @DecimalMin("-90.0")
        @DecimalMax("90.0")
        double latitude,

        @DecimalMin("-180.0")
        @DecimalMax("180.0")
        double longitude,

        @Positive
        double radiusKm,

        String difficulty,

        @Positive
        Double maxDistanceKm,

        @PositiveOrZero
        Integer maxElevationGainM

) {
}