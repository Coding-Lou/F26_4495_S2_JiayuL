package com.jay.outdoor.activity.support;

import com.jay.outdoor.activity.dto.CreateGroupEventRequest;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

public final class GroupEventTestRequests {
    public static final UUID TRAIL_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private GroupEventTestRequests() {}

    public static CreateGroupEventRequest command(Instant start) {
        return command(start, 12, 48);
    }

    public static CreateGroupEventRequest command(Instant start, int capacity, int closesBeforeStartHours) {
        return new CreateGroupEventRequest(
                TRAIL_ID, "Weekend hike", "Meet at the trailhead", capacity,
                start.minus(72, ChronoUnit.HOURS),
                start.minus(closesBeforeStartHours, ChronoUnit.HOURS),
                start, start.plus(4, ChronoUnit.HOURS));
    }
}
