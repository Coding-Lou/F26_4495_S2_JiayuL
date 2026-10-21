package com.jay.outdoor.memory.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** No visibility, updatedAt, owner, or author identity (D4). */
public record PublicMemoryDetail(
        UUID id,
        UUID trailId,
        LocalDate tripDate,
        String title,
        String story,
        List<PublicPhoto> photos,
        OffsetDateTime createdAt
) {
}
