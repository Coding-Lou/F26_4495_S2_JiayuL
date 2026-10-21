package com.jay.outdoor.recommendation.dto;

public record TrailWeather(
        double temperatureC,
        double precipitationProbability,
        double windSpeedKmh
) {
}