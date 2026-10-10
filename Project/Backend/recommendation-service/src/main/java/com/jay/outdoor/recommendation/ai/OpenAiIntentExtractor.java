package com.jay.outdoor.recommendation.ai;

import com.jay.outdoor.recommendation.dto.RecommendationIntent;
import org.springframework.stereotype.Component;

@Component
public class OpenAiIntentExtractor implements IntentExtractor {

    private final OpenAiIntentClient intentClient;
    private final IntentPromptBuilder promptBuilder;

    public OpenAiIntentExtractor(
            OpenAiIntentClient intentClient,
            IntentPromptBuilder promptBuilder
    ) {
        this.intentClient = intentClient;
        this.promptBuilder = promptBuilder;
    }

    @Override
    public RecommendationIntent extract(String message) {

        String systemPrompt =
                promptBuilder.buildSystemPrompt();

        String userPrompt =
                promptBuilder.buildUserPrompt(message);

        IntentExtractionOutput output =
                intentClient.extract(
                        systemPrompt,
                        userPrompt
                );

        return new RecommendationIntent(
                output.difficulty.orElse(null),
                output.maxDistanceKm.orElse(null),
                output.maxElevationGainM.orElse(null),
                output.maxDurationMin.orElse(null),
                output.preferredScenery
        );
    }
}