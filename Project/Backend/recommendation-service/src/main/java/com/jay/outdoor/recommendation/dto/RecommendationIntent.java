package com.jay.outdoor.recommendation.dto;

import java.util.List;

public record RecommendationIntent(

        TrailDifficulty difficulty,

        Double maxDistanceKm,

        Integer maxElevationGainM,

        Integer maxDurationMin,

        List<SceneryType> preferredScenery

) {
}