package com.jay.outdoor.trail.dto;

import java.time.LocalDate;
import java.util.List;

public record TrailActivityResponse(
        LocalDate date,
        ActivitySource source,
        List<TrailActivityItemResponse> trails
) {
}
