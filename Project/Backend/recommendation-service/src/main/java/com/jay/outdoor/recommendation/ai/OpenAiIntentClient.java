package com.jay.outdoor.recommendation.ai;

public interface OpenAiIntentClient {

    IntentExtractionOutput extract(
            String systemPrompt,
            String userPrompt
    );
}