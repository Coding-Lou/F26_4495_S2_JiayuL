package com.jay.outdoor.recommendation.client.user;

import com.jay.outdoor.recommendation.dto.GearCategory;

import java.time.OffsetDateTime;
import java.util.UUID;

public record GearResponse(
        UUID id,
        String name,
        GearCategory category,
        String description,
        OffsetDateTime createdAt
) {
}
