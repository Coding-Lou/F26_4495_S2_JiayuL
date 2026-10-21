package com.jay.outdoor.recommendation.ai;

import com.jay.outdoor.recommendation.dto.DurationMode;
import com.jay.outdoor.recommendation.dto.PlanningPreference;
import com.jay.outdoor.recommendation.dto.SceneryType;
import com.jay.outdoor.recommendation.dto.TrailDifficulty;

import java.util.List;
import java.util.Optional;

/**
 * The model's structured output. Internal: it is not a wire contract.
 * {@code durationMin} is the hike duration in minutes and
 * {@code durationMode} how it is read; both map to the planning context's
 * {@code maxDurationMin} and {@code durationMode}.
 */
public class IntentExtractionOutput {

    public Optional<TrailDifficulty> difficulty;

    public Optional<Double> maxDistanceKm;

    public Optional<Integer> maxElevationGainM;

    public Optional<Integer> durationMin;

    public Optional<DurationMode> durationMode;

    public Optional<List<SceneryType>> preferredScenery;

    public Optional<List<PlanningPreference>> openPreferences;

    public Optional<Boolean> generallyFlexible;
}
