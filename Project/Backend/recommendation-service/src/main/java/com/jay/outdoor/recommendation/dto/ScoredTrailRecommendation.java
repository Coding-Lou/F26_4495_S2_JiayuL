package com.jay.outdoor.recommendation.dto;

import com.jay.outdoor.recommendation.client.trail.TrailSummaryResponse;

public record ScoredTrailRecommendation(
        TrailSummaryResponse trail,
        int score,
        ScoreBreakdown breakdown
) {
}
