package com.jay.outdoor.recommendation.client.trail;

import com.jay.outdoor.recommendation.dto.GearCategory;

import java.util.Set;
import java.util.UUID;

public record TrailSummaryResponse(
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
        Set<String> scenery,
        String coverImageUrl,
        Set<GearCategory> baselineGearRequirements
) {
}