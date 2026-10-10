package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse;
import com.jay.outdoor.recommendation.dto.TrailWeather;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class GearRequirementService {

    public List<String> determineRequiredGear(
            NearbyTrailResponse trail,
            TrailWeather weather
    ) {

        List<String> requiredGear =
                new ArrayList<>();

        // Basic hiking requirements
        requiredGear.add("Footwear");
        requiredGear.add("Water");

        addWeatherRequirements(
                requiredGear,
                weather
        );

        addTrailRequirements(
                requiredGear,
                trail
        );

        return requiredGear.stream()
                .distinct()
                .toList();
    }

    private void addWeatherRequirements(
            List<String> requiredGear,
            TrailWeather weather
    ) {

        if (weather == null) {
            return;
        }

        if (weather.precipitationProbability() >= 40) {
            requiredGear.add("Rain Gear");
        }

        if (weather.temperatureC() <= 5) {
            requiredGear.add("Warm Layer");
        }

        if (weather.windSpeedKmh() >= 30) {
            requiredGear.add("Wind Layer");
        }
    }

    private void addTrailRequirements(
            List<String> requiredGear,
            NearbyTrailResponse trail
    ) {

        if (trail == null) {
            return;
        }

        if ("HARD".equalsIgnoreCase(
                trail.difficulty()
        )) {
            requiredGear.add("Hiking Poles");
        }

        if (trail.distanceKm() != null
                && trail.distanceKm() >= 10) {

            requiredGear.add("Food");
        }

        if (trail.estimatedDurationMin() != null
                && trail.estimatedDurationMin() >= 240) {

            requiredGear.add("Food");
        }
    }
}