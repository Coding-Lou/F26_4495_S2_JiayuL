package com.jay.outdoor.recommendation.dto;

import java.util.List;
import java.util.UUID;

public record PackRecommendationResponse(
        UUID trailId,
        String trailName,
        TrailWeather weather,
        boolean weatherAvailable,
        List<PackItemStatus> requiredGear,
        int readinessPercentage
) {
}