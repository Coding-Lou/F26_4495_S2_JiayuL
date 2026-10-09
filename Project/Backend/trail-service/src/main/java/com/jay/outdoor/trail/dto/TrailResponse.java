package com.jay.outdoor.trail.dto;

import java.util.UUID;

public record TrailResponse(
        UUID id,
        String name,
        String description,
        String difficulty,
        double distanceKm,
        Integer elevationGainM,
        Integer estimatedDurationMin,
        double latitude,
        double longitude,
        String source
) {
}