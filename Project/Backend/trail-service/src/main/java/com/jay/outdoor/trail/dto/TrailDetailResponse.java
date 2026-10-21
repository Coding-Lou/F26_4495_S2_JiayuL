package com.jay.outdoor.trail.dto;

import com.jay.outdoor.trail.entity.GearCategory;
import tools.jackson.databind.JsonNode;

import java.util.Set;
import java.util.UUID;

public record TrailDetailResponse(
        UUID id,
        String name,
        String description,
        String difficulty,
        Double distanceKm,
        Integer elevationGainM,
        Integer estimatedDurationMin,
        Double latitude,
        Double longitude,
        JsonNode route,
        String source,
        String coverImageUrl,
        Set<String> scenery,
        Set<GearCategory> baselineGearRequirements
) {
}
