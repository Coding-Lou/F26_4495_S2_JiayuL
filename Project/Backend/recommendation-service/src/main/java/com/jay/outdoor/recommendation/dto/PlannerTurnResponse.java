package com.jay.outdoor.recommendation.dto;

import java.util.List;

public record PlannerTurnResponse(
        PlannerStatus status,
        String assistantMessage,
        PlanningContext context,
        List<ScoredTrailRecommendation> recommendations
) {
}
