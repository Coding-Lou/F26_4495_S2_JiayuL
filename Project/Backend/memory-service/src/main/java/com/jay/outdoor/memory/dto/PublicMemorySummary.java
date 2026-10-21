package com.jay.outdoor.memory.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/** No visibility, updatedAt, owner, or author identity (D4). */
public record PublicMemorySummary(
        UUID id,
        UUID trailId,
        LocalDate tripDate,
        String title,
        String storyExcerpt,
        boolean storyTruncated,
        int photoCount,
        PublicPhoto coverPhoto,
        OffsetDateTime createdAt
) {
}
