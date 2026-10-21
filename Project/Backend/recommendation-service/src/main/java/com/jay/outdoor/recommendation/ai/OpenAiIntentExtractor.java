package com.jay.outdoor.recommendation.ai;

import com.jay.outdoor.recommendation.dto.DurationMode;
import com.jay.outdoor.recommendation.dto.PlanningContext;
import com.jay.outdoor.recommendation.dto.PlanningContextDelta;
import com.jay.outdoor.recommendation.dto.PlanningPreference;
import com.jay.outdoor.recommendation.dto.RecommendationIntent;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

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

    /**
     * One-shot extraction. Open preferences are not part of
     * {@link RecommendationIntent} and are ignored here. The duration is
     * mapped exactly as in {@link #extractDelta}.
     */
    @Override
    public RecommendationIntent extract(String message) {

        IntentExtractionOutput output = intentClient.extract(
                promptBuilder.buildSystemPrompt(),
                promptBuilder.buildUserPrompt(message)
        );

        Integer durationMin = orNull(output.durationMin);

        return new RecommendationIntent(
                output.difficulty.orElse(null),
                output.maxDistanceKm.orElse(null),
                output.maxElevationGainM.orElse(null),
                durationMin,
                durationMode(durationMin, output),
                output.preferredScenery.orElseGet(List::of)
        );
    }

    @Override
    public PlanningContextDelta extractDelta(
            String message,
            PlanningPreference pendingQuestion
    ) {

        IntentExtractionOutput output = intentClient.extract(
                promptBuilder.buildSystemPrompt(),
                promptBuilder.buildUserPrompt(message, pendingQuestion)
        );

        Integer durationMin = orNull(output.durationMin);

        return new PlanningContextDelta(
                output.difficulty.orElse(null),
                output.maxDistanceKm.orElse(null),
                output.maxElevationGainM.orElse(null),
                durationMin,
                durationMode(durationMin, output),
                output.preferredScenery.orElse(null),
                orNull(output.openPreferences),
                Boolean.TRUE.equals(orNull(output.generallyFlexible))
        );
    }

    /**
     * Null without a duration; a duration the model gave without a mode is
     * read as APPROXIMATE, like a bare "four hours".
     */
    private static DurationMode durationMode(
            Integer durationMin,
            IntentExtractionOutput output
    ) {
        return PlanningContext.normaliseDurationMode(
                durationMin,
                orNull(output.durationMode),
                DurationMode.APPROXIMATE
        );
    }

    private static <T> T orNull(Optional<T> value) {
        return value == null ? null : value.orElse(null);
    }
}
