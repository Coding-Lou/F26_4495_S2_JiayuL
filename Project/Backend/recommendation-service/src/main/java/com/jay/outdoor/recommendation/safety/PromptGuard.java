package com.jay.outdoor.recommendation.safety;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;

@Component
public class PromptGuard {

    private static final int MAX_MESSAGE_LENGTH = 2000;

    private static final List<String> SUSPICIOUS_PATTERNS = List.of(
            "ignore previous instructions",
            "ignore all previous instructions",
            "ignore system instructions",
            "reveal system prompt",
            "show system prompt",
            "print system prompt",
            "override system prompt",
            "developer message",
            "system message",
            "act as system",
            "bypass restrictions"
    );

    public boolean isAllowed(String message) {

        if (message == null || message.isBlank()) {
            return false;
        }

        if (message.length() > MAX_MESSAGE_LENGTH) {
            return false;
        }

        String normalizedMessage =
                message.toLowerCase(Locale.ROOT);

        return SUSPICIOUS_PATTERNS.stream()
                .noneMatch(normalizedMessage::contains);
    }
}