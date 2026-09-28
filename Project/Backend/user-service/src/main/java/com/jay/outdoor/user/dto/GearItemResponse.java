package com.jay.outdoor.user.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record GearItemResponse(
        UUID id,
        String name,
        String category,
        String description,
        OffsetDateTime createdAt
) {}