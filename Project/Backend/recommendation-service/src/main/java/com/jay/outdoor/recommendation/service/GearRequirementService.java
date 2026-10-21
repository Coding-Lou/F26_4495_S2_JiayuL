package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.client.trail.TrailSummaryResponse;
import com.jay.outdoor.recommendation.dto.GearCategory;
import com.jay.outdoor.recommendation.dto.TrailWeather;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class GearRequirementService {

    public List<GearCategory> determineRequiredGear(
            TrailSummaryResponse trail,
            TrailWeather weather
    ) {

        Set<GearCategory> requiredGear =
                new LinkedHashSet<>();

        addTrailBaselineRequirements(
                requiredGear,
                trail
        );

        addWeatherRequirements(
                requiredGear,
                weather
        );

        return List.copyOf(requiredGear);
    }

    private void addTrailBaselineRequirements(
            Set<GearCategory> requiredGear,
            TrailSummaryResponse trail
    ) {

        if (trail == null
                || trail.baselineGearRequirements() == null) {
            return;
        }

        requiredGear.addAll(
                trail.baselineGearRequirements()
        );
    }

    private void addWeatherRequirements(
            Set<GearCategory> requiredGear,
            TrailWeather weather
    ) {

        if (weather == null) {
            return;
        }

        if (weather.precipitationProbability() >= 40) {
            requiredGear.add(
                    GearCategory.RAIN_GEAR
            );
        }

        if (weather.temperatureC() <= 5) {
            requiredGear.add(
                    GearCategory.WARM_LAYER
            );
        }

        if (weather.windSpeedKmh() >= 30) {
            requiredGear.add(
                    GearCategory.WIND_LAYER
            );
        }

        if (weather.temperatureC() >= 25
                && weather.precipitationProbability() < 20) {

            requiredGear.add(
                    GearCategory.SUN_PROTECTION
            );
        }
    }
}