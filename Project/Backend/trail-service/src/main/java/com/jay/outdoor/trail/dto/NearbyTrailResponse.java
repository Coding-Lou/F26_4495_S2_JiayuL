package com.jay.outdoor.trail.dto;

public record NearbyTrailResponse(
        TrailSummaryResponse trail,
        Double distanceFromUserKm
) {
}
