package com.jay.outdoor.plan.dto;

import com.jay.outdoor.plan.entity.Plan;
import com.jay.outdoor.plan.entity.PlanStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * The one Plan response, for create, list, and detail (D11). Never carries the
 * owner subject or the deleted flag. Timestamps are normalised to UTC so the same
 * instant serialises identically whether it came from the just-persisted entity
 * or from a database read (spec section 12).
 */
public record PlanResponse(
        UUID id,
        UUID trailId,
        LocalDate tripDate,
        PlanStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {

    public static PlanResponse of(Plan plan) {
        return new PlanResponse(
                plan.getId(),
                plan.getTrailId(),
                plan.getTripDate(),
                plan.getStatus(),
                utc(plan.getCreatedAt()),
                utc(plan.getUpdatedAt())
        );
    }

    private static OffsetDateTime utc(OffsetDateTime value) {
        return value == null ? null : value.withOffsetSameInstant(ZoneOffset.UTC);
    }
}
