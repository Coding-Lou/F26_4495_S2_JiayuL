package com.jay.outdoor.recommendation.ai;

import com.jay.outdoor.recommendation.dto.PlanningContextDelta;
import com.jay.outdoor.recommendation.dto.RecommendationIntent;
import org.springframework.stereotype.Component;

import java.util.List;

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

        IntentExtractionOutput output = extractOutput(message);

        return new RecommendationIntent(
                output.difficulty.orElse(null),
                output.maxDistanceKm.orElse(null),
                output.maxElevationGainM.orElse(null),
                output.maxDurationMin.orElse(null),
                output.preferredScenery.orElseGet(List::of)
        );
    }

    @Override
    public PlanningContextDelta extractDelta(String message) {

        IntentExtractionOutput output = extractOutput(message);

        return new PlanningContextDelta(
                output.difficulty.orElse(null),
                output.maxDistanceKm.orElse(null),
                output.maxElevationGainM.orElse(null),
                output.maxDurationMin.orElse(null),
                output.preferredScenery.orElse(null)
        );
    }

    private IntentExtractionOutput extractOutput(String message) {

        String systemPrompt =
                promptBuilder.buildSystemPrompt();

        String userPrompt =
                promptBuilder.buildUserPrompt(message);

        return intentClient.extract(
                systemPrompt,
                userPrompt
        );
    }
}
