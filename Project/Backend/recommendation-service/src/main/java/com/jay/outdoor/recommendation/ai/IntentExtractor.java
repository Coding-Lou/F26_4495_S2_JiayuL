package com.jay.outdoor.recommendation.ai;

import com.jay.outdoor.recommendation.dto.RecommendationIntent;

public interface IntentExtractor {

    RecommendationIntent extract(String message);
}