package com.jay.outdoor.trail.controller;

import com.jay.outdoor.trail.dto.NearbyTrailResponse;
import com.jay.outdoor.trail.dto.TrailActivityResponse;
import com.jay.outdoor.trail.dto.TrailDetailResponse;
import com.jay.outdoor.trail.dto.TrailSummaryResponse;
import com.jay.outdoor.trail.service.TrailService;
import com.jay.outdoor.trail.service.TrailActivityService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;
import java.util.UUID;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/api/trails")
public class TrailController {

    private final TrailService trailService;
    private final TrailActivityService trailActivityService;

    public TrailController(TrailService trailService,
                           TrailActivityService trailActivityService) {
        this.trailService = trailService;
        this.trailActivityService = trailActivityService;
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

    /**
     * Daily Trail Activity for every non-deleted trail on {@code date}
     * (ISO {@code YYYY-MM-DD}), which must be within one day of the server's
     * local date. Public. The source is currently SIMULATED; see
     * {@link TrailActivityService#simulatedCount} for the function.
     * This literal path is matched before {@code /{id}}.
     */
    @GetMapping("/activity")
    public TrailActivityResponse getActivity(
            @RequestParam("date")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return trailActivityService.getActivity(date);
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
            @Positive(message = "radiusKm must be greater than 0")
            @DecimalMax(value = "150.0", message = "radiusKm must be at most 150")
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
