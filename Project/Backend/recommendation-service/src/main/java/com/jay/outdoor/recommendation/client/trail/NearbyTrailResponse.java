package com.jay.outdoor.recommendation.client.trail;

public record NearbyTrailResponse(
        TrailSummaryResponse trail,
        Double distanceFromUserKm
) {
}
