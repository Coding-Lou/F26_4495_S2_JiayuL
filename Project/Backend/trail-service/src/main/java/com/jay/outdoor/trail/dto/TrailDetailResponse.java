package com.jay.outdoor.trail.dto;

import tools.jackson.databind.JsonNode;

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
        String source
) {
}