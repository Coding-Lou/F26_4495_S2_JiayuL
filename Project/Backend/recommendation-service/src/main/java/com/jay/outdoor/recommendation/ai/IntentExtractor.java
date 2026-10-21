package com.jay.outdoor.recommendation.ai;

import com.jay.outdoor.recommendation.dto.PlanningContextDelta;
import com.jay.outdoor.recommendation.dto.PlanningPreference;
import com.jay.outdoor.recommendation.dto.RecommendationIntent;

public interface IntentExtractor {

    RecommendationIntent extract(String message);

    /**
     * @param pendingQuestion the dimension the planner's previous
     *                        clarification asked about, or null
     */
    PlanningContextDelta extractDelta(
            String message,
            PlanningPreference pendingQuestion
    );
}
