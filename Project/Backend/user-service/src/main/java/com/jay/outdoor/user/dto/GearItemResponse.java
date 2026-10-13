package com.jay.outdoor.user.dto;

import com.jay.outdoor.user.entity.GearCategory;

import java.time.OffsetDateTime;
import java.util.UUID;

public record GearItemResponse(
        UUID id,
        String name,
        GearCategory category,
        String description,
        OffsetDateTime createdAt
) {}
