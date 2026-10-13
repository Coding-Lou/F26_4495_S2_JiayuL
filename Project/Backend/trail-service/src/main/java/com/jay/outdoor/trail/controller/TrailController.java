package com.jay.outdoor.trail.controller;

import com.jay.outdoor.trail.dto.NearbyTrailResponse;
import com.jay.outdoor.trail.dto.TrailDetailResponse;
import com.jay.outdoor.trail.dto.TrailSummaryResponse;
import com.jay.outdoor.trail.service.TrailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;
import java.util.UUID;

import org.springframework.validation.annotation.Validated;

@Validated
@RestController
@RequestMapping("/api/trails")
public class TrailController {

    private final TrailService trailService;

    public TrailController(TrailService trailService) {
        this.trailService = trailService;
    }


    @GetMapping
    public List<TrailSummaryResponse> searchTrails(
            @RequestParam(required = false)
            String search,

            @RequestParam(required = false)
            String difficulty,

            @RequestParam(required = false)
            @Positive(message = "maxDistanceKm must be greater than 0")
            Double maxDistanceKm,

            @RequestParam(required = false)
            @PositiveOrZero(message = "maxElevationGainM must be 0 or greater")
            Integer maxElevationGainM
    ) {
        return trailService.searchTrails(
                search,
                difficulty,
                maxDistanceKm,
                maxElevationGainM
        );
    }

    @GetMapping("/nearby")
    public List<NearbyTrailResponse> getNearbyTrails(
            @RequestParam("lat")
            @DecimalMin(value = "-90.0")
            @DecimalMax(value = "90.0")
            double latitude,

            @RequestParam("lon")
            @DecimalMin(value = "-180.0")
            @DecimalMax(value = "180.0")
            double longitude,

            @RequestParam("radiusKm")
            @Positive
            double radiusKm
    ) {
        return trailService.getNearbyTrails(
                latitude,
                longitude,
                radiusKm
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<TrailDetailResponse> getTrailById(
            @PathVariable UUID id
    ) {
        return trailService.getTrailDetail(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
