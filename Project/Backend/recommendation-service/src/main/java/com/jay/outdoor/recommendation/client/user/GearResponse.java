package com.jay.outdoor.recommendation.client.user;

import java.time.OffsetDateTime;
import java.util.UUID;

public record GearResponse(
        UUID id,
        String name,
        String category,
        String description,
        OffsetDateTime createdAt
) {
}