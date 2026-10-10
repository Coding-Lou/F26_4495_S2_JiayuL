package com.jay.outdoor.recommendation.controller;

import com.jay.outdoor.recommendation.client.trail.NearbyTrailResponse;
import com.jay.outdoor.recommendation.dto.RecommendationRequest;
import com.jay.outdoor.recommendation.service.RecommendationService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.jay.outdoor.recommendation.dto.RecommendationQueryRequest;
import com.jay.outdoor.recommendation.dto.RecommendationResponse;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(
            RecommendationService recommendationService
    ) {
        this.recommendationService = recommendationService;
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
}