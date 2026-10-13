package com.jay.outdoor.recommendation.service;

import com.jay.outdoor.recommendation.client.trail.TrailServiceClient;
import com.jay.outdoor.recommendation.client.trail.TrailSummaryResponse;
import com.jay.outdoor.recommendation.client.user.GearResponse;
import com.jay.outdoor.recommendation.client.user.UserServiceClient;
import com.jay.outdoor.recommendation.client.weather.WeatherServiceClient;
import com.jay.outdoor.recommendation.dto.GearCategory;
import com.jay.outdoor.recommendation.dto.PackItemStatus;
import com.jay.outdoor.recommendation.dto.PackRecommendationRequest;
import com.jay.outdoor.recommendation.dto.PackRecommendationResponse;
import com.jay.outdoor.recommendation.dto.TrailWeather;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class PackRecommendationService {

    private final TrailServiceClient trailServiceClient;
    private final UserServiceClient userServiceClient;
    private final WeatherServiceClient weatherServiceClient;
    private final GearRequirementService gearRequirementService;

    public PackRecommendationService(
            TrailServiceClient trailServiceClient,
            UserServiceClient userServiceClient,
            WeatherServiceClient weatherServiceClient,
            GearRequirementService gearRequirementService
    ) {
        this.trailServiceClient = trailServiceClient;
        this.userServiceClient = userServiceClient;
        this.weatherServiceClient = weatherServiceClient;
        this.gearRequirementService = gearRequirementService;
    }

    public PackRecommendationResponse getPackRecommendation(
            PackRecommendationRequest request,
            String accessToken
    ) {

        TrailSummaryResponse trail =
                trailServiceClient.getTrailById(
                        request.trailId(),
                        accessToken
                );

        TrailWeather weather = null;
        boolean weatherAvailable = true;

        try {
            weather = weatherServiceClient.getWeather(
                    trail.latitude(),
                    trail.longitude(),
                    request.tripDate()
            );
        } catch (Exception ex) {
            weatherAvailable = false;
        }
        List<GearResponse> userGear =
                userServiceClient.getCurrentUserGear(
                        accessToken
                );

        List<GearCategory> requiredGear =
                gearRequirementService.determineRequiredGear(
                        trail,
                        weather
                );

        Set<GearCategory> ownedCategories =
                getOwnedGearCategories(userGear);

        List<PackItemStatus> gearStatus =
                requiredGear.stream()
                        .map(category ->
                                new PackItemStatus(
                                        category,
                                        ownedCategories.contains(category)
                                )
                        )
                        .toList();

        int readinessPercentage =
                calculateReadinessPercentage(
                        gearStatus
                );

        return new PackRecommendationResponse(
                trail.id(),
                trail.name(),
                weather,
                weatherAvailable,
                gearStatus,
                readinessPercentage
        );
    }

    private Set<GearCategory> getOwnedGearCategories(
            List<GearResponse> userGear
    ) {

        Set<GearCategory> owned =
                new HashSet<>();

        for (GearResponse gear : userGear) {

            if (gear.category() != null) {
                owned.add(
                        gear.category()
                );
            }
        }

        return owned;
    }

    private int calculateReadinessPercentage(
            List<PackItemStatus> gearStatus
    ) {

        if (gearStatus.isEmpty()) {
            return 100;
        }

        long ownedCount =
                gearStatus.stream()
                        .filter(PackItemStatus::owned)
                        .count();

        double ratio =
                (double) ownedCount
                        / gearStatus.size();

        return (int) Math.round(
                ratio * 100
        );
    }
}