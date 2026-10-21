package com.jay.outdoor.memory.dto;

import com.jay.outdoor.memory.entity.MemoryVisibility;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record OwnerMemorySummary(
        UUID id,
        UUID trailId,
        LocalDate tripDate,
        String title,
        MemoryVisibility visibility,
        int photoCount,
        MemoryPhotoResponse coverPhoto,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
