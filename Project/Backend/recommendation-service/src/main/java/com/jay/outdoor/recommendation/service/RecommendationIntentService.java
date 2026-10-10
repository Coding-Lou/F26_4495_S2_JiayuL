package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.ai.IntentExtractor;
import com.jay.outdoor.recommendation.dto.RecommendationIntent;
import com.jay.outdoor.recommendation.exception.UnsafePromptException;
import com.jay.outdoor.recommendation.safety.PromptGuard;
import org.springframework.stereotype.Service;

@Service
public class RecommendationIntentService {

    private final PromptGuard promptGuard;
    private final IntentExtractor intentExtractor;

    public RecommendationIntentService(
            PromptGuard promptGuard,
            IntentExtractor intentExtractor
    ) {
        this.promptGuard = promptGuard;
        this.intentExtractor = intentExtractor;
    }

    public RecommendationIntent extractIntent(String message) {

        validatePrompt(message);

        return intentExtractor.extract(message);
    }

    private void validatePrompt(String message) {

        if (!promptGuard.isAllowed(message)) {
            throw new UnsafePromptException(
                    "The request contains unsupported or unsafe instructions."
            );
        }
    }
}