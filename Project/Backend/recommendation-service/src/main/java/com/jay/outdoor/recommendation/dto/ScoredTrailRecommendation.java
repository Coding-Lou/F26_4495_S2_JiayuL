package com.jay.outdoor.recommendation.dto;

import com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse;

public record ScoredTrailRecommendation(
        NearbyTrailResponse trail,
        int score,
        ScoreBreakdown breakdown
) {
}