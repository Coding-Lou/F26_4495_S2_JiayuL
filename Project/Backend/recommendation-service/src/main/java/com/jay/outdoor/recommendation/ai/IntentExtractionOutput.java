package com.jay.outdoor.recommendation.ai;

import com.jay.outdoor.recommendation.dto.SceneryType;
import com.jay.outdoor.recommendation.dto.TrailDifficulty;

import java.util.List;
import java.util.Optional;

public class IntentExtractionOutput {

    public Optional<TrailDifficulty> difficulty;

    public Optional<Double> maxDistanceKm;

    public Optional<Integer> maxElevationGainM;

    public Optional<Integer> maxDurationMin;

    public Optional<List<SceneryType>> preferredScenery;
}
