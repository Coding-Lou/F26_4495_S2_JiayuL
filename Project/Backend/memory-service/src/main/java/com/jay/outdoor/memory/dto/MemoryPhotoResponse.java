package com.jay.outdoor.memory.dto;

import java.time.Instant;
import java.util.UUID;

public record MemoryPhotoResponse(
        UUID id,
        int position,
        String url,
        Instant urlExpiresAt
) {
}
