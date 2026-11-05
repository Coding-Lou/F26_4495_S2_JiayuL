package com.jay.outdoor.activity.dto;

import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.entity.GroupEventStatus;

import java.time.Instant;
import java.util.UUID;

public record GroupEventResponse(
        UUID id,
        UUID trailId,
        String title,
        String description,
        int capacity,
        Instant startsAt,
        Instant endsAt,
        GroupEventStatus status,
        Instant createdAt
) {
    public static GroupEventResponse from(GroupEvent event) {
        return new GroupEventResponse(
                event.getId(),
                event.getTrailId(),
                event.getTitle(),
                event.getDescription(),
                event.getCapacity(),
                event.getStartsAt(),
                event.getEndsAt(),
                event.getStatus(),
                event.getCreatedAt());
    }
}
