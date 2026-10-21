package com.jay.outdoor.recommendation.ai;

import com.openai.client.OpenAIClient;
import com.openai.core.JsonSchemaLocalValidation;
import com.openai.models.responses.ResponseCreateParams;
import com.openai.models.responses.StructuredResponse;
import com.openai.models.responses.StructuredResponseCreateParams;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OpenAiIntentClientImpl
        implements OpenAiIntentClient {

    private final OpenAIClient openAIClient;
    private final String model;

    public OpenAiIntentClientImpl(
            OpenAIClient openAIClient,
            @Value("${openai.model}") String model
    ) {
        this.openAIClient = openAIClient;
        this.model = model;
    }

    @Override
    public IntentExtractionOutput extract(
            String systemPrompt,
            String userPrompt
    ) {

        var request =
                buildRequest(systemPrompt, userPrompt);

        var response =
                openAIClient.responses().create(request);

        return extractOutput(response);
    }

    private StructuredResponseCreateParams<IntentExtractionOutput>
    buildRequest(
            String systemPrompt,
            String userPrompt
    ) {
        return ResponseCreateParams.builder()
                .instructions(systemPrompt)
                .input(userPrompt)
                .text(
                        IntentExtractionOutput.class,
                        JsonSchemaLocalValidation.NO
                )
                .model(model)
                .build();
    }

    private IntentExtractionOutput extractOutput(
            StructuredResponse<IntentExtractionOutput> response
    ) {
        return response.output()
                .stream()
                .flatMap(item -> item.message().stream())
                .flatMap(message -> message.content().stream())
                .flatMap(content -> content.outputText().stream())
                .findFirst()
                .orElseThrow(() ->
                        new IllegalStateException(
                                "OpenAI returned no intent output"
                        )
                );
    }
}
