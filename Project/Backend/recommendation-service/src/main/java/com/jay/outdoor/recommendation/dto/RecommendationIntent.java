package com.jay.outdoor.recommendation.dto;

import java.util.List;

/**
 * Structured hiking preferences used for scoring.
 *
 * <p>{@code maxDurationMin} is the duration value in minutes and
 * {@code durationMode} how it is read (see {@link DurationMode}). The mode is
 * null exactly when there is no duration; a duration given without a mode is
 * read as {@link DurationMode#MAXIMUM}.
 */
public record RecommendationIntent(

        TrailDifficulty difficulty,

        Double maxDistanceKm,

        Integer maxElevationGainM,

        Integer maxDurationMin,

        DurationMode durationMode,

        List<SceneryType> preferredScenery

) {
    public RecommendationIntent {
        durationMode = PlanningContext.normaliseDurationMode(
                maxDurationMin,
                durationMode,
                DurationMode.MAXIMUM
        );
    }
}
