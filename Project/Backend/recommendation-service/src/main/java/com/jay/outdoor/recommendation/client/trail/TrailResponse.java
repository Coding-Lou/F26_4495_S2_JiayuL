package com.jay.outdoor.recommendation.client.trail;

import java.util.UUID;

public record TrailResponse(
        UUID id,
        String name,
        String description,
        String difficulty,
        Double distanceKm,
        Integer elevationGainM,
        Integer estimatedDurationMin,
        Double latitude,
        Double longitude,
        String source
) {
}