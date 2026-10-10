package com.jay.outdoor.recommendation.client.trail;

import java.util.Set;
import java.util.UUID;

public record NearbyTrailResponse(
        UUID id,
        String name,
        String description,
        String difficulty,
        Double distanceKm,
        Integer elevationGainM,
        Integer estimatedDurationMin,
        Double latitude,
        Double longitude,
        String source,
        Double distanceFromUserKm,
        Set<String> scenery
) {
}