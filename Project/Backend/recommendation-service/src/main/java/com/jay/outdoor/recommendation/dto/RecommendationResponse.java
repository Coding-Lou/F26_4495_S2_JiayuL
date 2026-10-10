package com.jay.outdoor.recommendation.dto;

import java.util.List;

public record RecommendationResponse(
        List<ScoredTrailRecommendation> recommendations
) {
}