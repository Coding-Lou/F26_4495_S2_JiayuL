package com.jay.outdoor.memory.dto;

import com.jay.outdoor.memory.entity.MemoryVisibility;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record OwnerMemoryDetail(
        UUID id,
        UUID trailId,
        LocalDate tripDate,
        String title,
        String story,
        MemoryVisibility visibility,
        List<MemoryPhotoResponse> photos,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
