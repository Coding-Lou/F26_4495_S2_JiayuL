package com.jay.outdoor.trail.service;

import com.jay.outdoor.trail.dto.TrailResponse;
import com.jay.outdoor.trail.entity.Trail;
import com.jay.outdoor.trail.entity.TrailDifficulty;
import com.jay.outdoor.trail.repository.TrailRepository;
import com.jay.outdoor.trail.dto.NearbyTrailResponse;
import com.jay.outdoor.trail.repository.NearbyTrailProjection;
import com.jay.outdoor.trail.dto.TrailDetailResponse;
import com.jay.outdoor.trail.repository.TrailDetailProjection;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TrailService {

    private final TrailRepository trailRepository;
    private final ObjectMapper objectMapper;

    public TrailService(
            TrailRepository trailRepository,
            ObjectMapper objectMapper
    ) {
        this.trailRepository = trailRepository;
        this.objectMapper = objectMapper;
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private String normalizeDifficulty(String difficulty) {
        if (difficulty == null || difficulty.isBlank()) {
            return null;
        }

        try {
            return TrailDifficulty
                    .valueOf(difficulty.trim().toUpperCase())
                    .name();
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "difficulty must be one of: EASY, MODERATE, HARD"
            );
        }
    }

    public List<TrailResponse> searchTrails(
            String search,
            String difficulty,
            Double maxDistanceKm,
            Integer maxElevationGainM
    ) {
        return trailRepository.searchTrails(
                        normalize(search),
                        normalizeDifficulty(difficulty),
                        maxDistanceKm,
                        maxElevationGainM
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public Optional<TrailResponse> getTrailById(UUID id) {
        return trailRepository.findByIdAndDeletedFalse(id)
                .map(this::toResponse);
    }

    public List<NearbyTrailResponse> getNearbyTrails(
            double latitude,
            double longitude,
            double radiusKm
    ) {
        double radiusMeters = radiusKm * 1000;

        return trailRepository
                .findNearbyTrails(latitude, longitude, radiusMeters)
                .stream()
                .map(this::toNearbyResponse)
                .toList();
    }

    private TrailResponse toResponse(Trail trail) {
        return new TrailResponse(
                trail.getId(),
                trail.getName(),
                trail.getDescription(),
                trail.getDifficulty().name(),
                trail.getDistanceKm(),
                trail.getElevationGainM(),
                trail.getEstimatedDurationMin(),
                trail.getTrailhead().getY(),
                trail.getTrailhead().getX(),
                trail.getSource()
        );
    }

    private NearbyTrailResponse toNearbyResponse(
            NearbyTrailProjection trail
    ) {
        return new NearbyTrailResponse(
                trail.getId(),
                trail.getName(),
                trail.getDescription(),
                trail.getDifficulty(),
                trail.getDistanceKm(),
                trail.getElevationGainM(),
                trail.getEstimatedDurationMin(),
                trail.getLatitude(),
                trail.getLongitude(),
                trail.getSource(),
                trail.getDistanceFromUserKm()
        );
    }

    public Optional<TrailDetailResponse> getTrailDetail(UUID id) {
        return trailRepository.findTrailDetailById(id)
                .map(this::toDetailResponse);
    }

    private TrailDetailResponse toDetailResponse(
            TrailDetailProjection trail
    ) {
        JsonNode route = null;

        if (trail.getRouteGeoJson() != null) {
            try {
                route = objectMapper.readTree(
                        trail.getRouteGeoJson()
                );
            } catch (Exception e) {
                throw new IllegalStateException(
                        "Failed to parse trail route GeoJSON",
                        e
                );
            }
        }

        return new TrailDetailResponse(
                trail.getId(),
                trail.getName(),
                trail.getDescription(),
                trail.getDifficulty(),
                trail.getDistanceKm(),
                trail.getElevationGainM(),
                trail.getEstimatedDurationMin(),
                trail.getLatitude(),
                trail.getLongitude(),
                route,
                trail.getSource()
        );
    }
}