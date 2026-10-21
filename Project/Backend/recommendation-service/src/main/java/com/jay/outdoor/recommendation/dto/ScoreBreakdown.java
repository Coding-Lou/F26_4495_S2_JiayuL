package com.jay.outdoor.recommendation.dto;

public record ScoreBreakdown(
        int intent,
        int weather,
        int gear,
        int scenery,
        int proximity
) {
}