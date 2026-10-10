package com.jay.outdoor.recommendation.dto;

import com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse;

import java.util.List;
import java.util.Set;

public record TrailCandidateContext(
        NearbyTrailResponse trail,

        TrailWeather weather,

        Set<SceneryType> scenery,

        List<String> requiredGearCategories,

        List<String> ownedGearCategories
) {
}