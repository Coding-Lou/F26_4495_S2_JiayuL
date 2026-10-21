package com.jay.outdoor.recommendation.dto;

import java.util.List;

/**
 * Preferences explicitly supplied by one planner message.
 * Null means the field was not mentioned; an empty scenery list explicitly
 * clears a previously selected scenery preference.
 *
 * <p>{@code openPreferences} are the dimensions this message explicitly
 * marked as "no preference": named in the message, or the dimension of the
 * pending question a bare "any" replies to. Naming a dimension clears any
 * value it already had.
 *
 * <p>{@code generallyFlexible} is a general statement of flexibility that
 * names no dimension ("Whatever is good. I'm flexible."). It opens only the
 * dimensions that are still unanswered and never clears a value.
 *
 * <p>{@code maxDurationMin} and {@code durationMode} travel together: the
 * mode is null exactly when there is no duration, and a duration extracted
 * without a mode is read as {@link DurationMode#APPROXIMATE}, the reading of a
 * bare "four hours".
 */
public record PlanningContextDelta(
        TrailDifficulty difficulty,
        Double maxDistanceKm,
        Integer maxElevationGainM,
        Integer maxDurationMin,
        DurationMode durationMode,
        List<SceneryType> preferredScenery,
        List<PlanningPreference> openPreferences,
        boolean generallyFlexible
) {
    public PlanningContextDelta {
        durationMode = PlanningContext.normaliseDurationMode(
                maxDurationMin,
                durationMode,
                DurationMode.APPROXIMATE
        );
        openPreferences =
                PlanningContext.normalisePreferences(openPreferences);
    }

    /**
     * A delta with explicit values only: no dimension marked open, and a
     * duration (if any) read as APPROXIMATE.
     */
    public PlanningContextDelta(
            TrailDifficulty difficulty,
            Double maxDistanceKm,
            Integer maxElevationGainM,
            Integer maxDurationMin,
            List<SceneryType> preferredScenery
    ) {
        this(
                difficulty,
                maxDistanceKm,
                maxElevationGainM,
                maxDurationMin,
                null,
                preferredScenery,
                List.of(),
                false
        );
    }
}
