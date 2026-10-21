package com.jay.outdoor.recommendation.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;

/**
 * Client-owned accumulated planning state.
 *
 * <p>{@code openPreferences} lists the dimensions the user explicitly answered
 * as "no preference"; it is normalised to an empty, de-duplicated list in
 * declaration order. {@code lastAsked} is the dimension the planner's latest
 * clarification asked about, or null. Both are optional on requests, so a
 * context from an older client without them is accepted.
 *
 * <p>{@code maxDurationMin} is the duration value in minutes (the name is kept
 * for wire compatibility) and {@code durationMode} says how it is read. The
 * mode is null exactly when there is no duration: a mode without a duration is
 * dropped, and a duration without a mode (an older client's context) is read
 * as {@link DurationMode#MAXIMUM}, its earlier meaning.
 */
public record PlanningContext(

        TrailDifficulty difficulty,

        @Positive(message = "maxDistanceKm must be greater than 0")
        Double maxDistanceKm,

        @PositiveOrZero(message = "maxElevationGainM must be greater than or equal to 0")
        Integer maxElevationGainM,

        @Positive(message = "maxDurationMin must be greater than 0")
        Integer maxDurationMin,

        DurationMode durationMode,

        List<@NotNull SceneryType> preferredScenery,

        List<PlanningPreference> openPreferences,

        PlanningPreference lastAsked

) {
    public PlanningContext {
        durationMode = normaliseDurationMode(
                maxDurationMin,
                durationMode,
                DurationMode.MAXIMUM
        );
        preferredScenery = preferredScenery == null
                ? List.of()
                : List.copyOf(preferredScenery);
        openPreferences = normalisePreferences(openPreferences);
    }

    public static PlanningContext empty() {
        return new PlanningContext(
                null,
                null,
                null,
                null,
                null,
                List.of(),
                List.of(),
                null
        );
    }

    public RecommendationIntent toRecommendationIntent() {
        return new RecommendationIntent(
                difficulty,
                maxDistanceKm,
                maxElevationGainM,
                maxDurationMin,
                durationMode,
                preferredScenery
        );
    }

    /**
     * Null when there is no duration; otherwise the given mode, or
     * {@code modeWhenMissing} when none was given.
     */
    public static DurationMode normaliseDurationMode(
            Integer durationMin,
            DurationMode mode,
            DurationMode modeWhenMissing
    ) {
        if (durationMin == null) {
            return null;
        }

        return mode != null ? mode : modeWhenMissing;
    }

    /**
     * Null becomes an empty list; null elements and duplicates are dropped,
     * and the result is in enum declaration order.
     */
    public static List<PlanningPreference> normalisePreferences(
            Collection<PlanningPreference> preferences
    ) {
        if (preferences == null) {
            return List.of();
        }

        EnumSet<PlanningPreference> set =
                EnumSet.noneOf(PlanningPreference.class);

        preferences.stream()
                .filter(Objects::nonNull)
                .forEach(set::add);

        return List.copyOf(set);
    }
}
