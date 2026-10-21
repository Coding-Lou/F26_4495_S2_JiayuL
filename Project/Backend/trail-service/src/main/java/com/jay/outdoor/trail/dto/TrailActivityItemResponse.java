package com.jay.outdoor.trail.dto;

import java.util.UUID;

public record TrailActivityItemResponse(
        UUID trailId,
        int activityCount
) {
}
