package com.jay.outdoor.memory.dto;

import java.time.Instant;
import java.util.UUID;

/** Public photo; a separate record from the owner's so neither can leak into the other. */
public record PublicPhoto(
        UUID id,
        int position,
        String url,
        Instant urlExpiresAt
) {
}
