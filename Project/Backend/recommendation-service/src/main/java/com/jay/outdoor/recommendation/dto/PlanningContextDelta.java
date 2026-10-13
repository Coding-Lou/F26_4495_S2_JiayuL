package com.jay.outdoor.recommendation.dto;

import java.util.List;

/**
 * Preferences explicitly supplied by one planner message.
 * Null means the field was not mentioned; an empty scenery list explicitly
 * clears a previously selected scenery preference.
 */
public record PlanningContextDelta(
        TrailDifficulty difficulty,
        Double maxDistanceKm,
        Integer maxElevationGainM,
        Integer maxDurationMin,
        List<SceneryType> preferredScenery
) {
}
