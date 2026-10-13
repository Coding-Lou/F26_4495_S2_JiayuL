package com.jay.outdoor.recommendation.controller;

import com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse;
import com.jay.outdoor.recommendation.dto.*;
import com.jay.outdoor.recommendation.service.PackRecommendationService;
import com.jay.outdoor.recommendation.service.RecommendationService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final PackRecommendationService packRecommendationService;

    public RecommendationController(
            RecommendationService recommendationService,
            PackRecommendationService packRecommendationService
    ) {
        this.recommendationService = recommendationService;
        this.packRecommendationService = packRecommendationService;
    }

    @PostMapping("/trails")
    public List<NearbyTrailResponse> recommendTrails(
            @Valid @RequestBody RecommendationRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String accessToken = jwt.getTokenValue();

        return recommendationService.recommendTrails(
                request,
                accessToken
        );
    }

    @PostMapping("/query")
    public RecommendationResponse recommendFromQuery(
            @Valid @RequestBody RecommendationQueryRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        String accessToken = jwt.getTokenValue();

        return recommendationService.recommendFromQuery(
                request,
                accessToken
        );
    }

    @PostMapping("/pack")
    public PackRecommendationResponse getPackRecommendation(
            @Valid @RequestBody PackRecommendationRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return packRecommendationService.getPackRecommendation(
                request,
                jwt.getTokenValue()
        );
    }
}