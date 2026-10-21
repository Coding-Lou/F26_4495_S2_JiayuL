package com.jay.outdoor.trail.service;

import com.jay.outdoor.trail.dto.NearbyTrailResponse;
import com.jay.outdoor.trail.dto.TrailDetailResponse;
import com.jay.outdoor.trail.dto.TrailSummaryResponse;
import com.jay.outdoor.trail.entity.GearCategory;
import com.jay.outdoor.trail.entity.Trail;
import com.jay.outdoor.trail.entity.TrailDifficulty;
import com.jay.outdoor.trail.repository.NearbyTrailProjection;
import com.jay.outdoor.trail.repository.TrailDetailProjection;
import com.jay.outdoor.trail.repository.TrailGearRequirementProjection;
import com.jay.outdoor.trail.repository.TrailRepository;
import com.jay.outdoor.trail.repository.TrailSceneryProjection;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

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


    // ------------------------------------------------
    // Search trails
    // ------------------------------------------------

    public List<TrailSummaryResponse> searchTrails(
            String search,
            String difficulty,
            Double maxDistanceKm,
            Integer maxElevationGainM
    ) {

        List<Trail> trails =
                trailRepository.searchTrails(
                        normalize(search),
                        normalizeDifficulty(difficulty),
                        maxDistanceKm,
                        maxElevationGainM
                );

        if (trails.isEmpty()) {
            return List.of();
        }

        List<UUID> trailIds =
                trails.stream()
                        .map(Trail::getId)
                        .toList();

        Map<UUID, Set<String>> sceneryByTrailId =
                getSceneryByTrailId(trailIds);

        Map<UUID, Set<GearCategory>> gearRequirementsByTrailId =
                getGearRequirementsByTrailId(trailIds);

        return trails.stream()
                .map(trail ->
                        toSummaryResponse(
                                trail,
                                sceneryByTrailId.getOrDefault(
                                        trail.getId(),
                                        Set.of()
                                ),
                                gearRequirementsByTrailId.getOrDefault(
                                        trail.getId(),
                                        Set.of()
                                )
                        )
                )
                .toList();
    }


    // ------------------------------------------------
    // Get trail by ID
    // ------------------------------------------------

    public Optional<TrailSummaryResponse> getTrailById(
            UUID id
    ) {

        Optional<Trail> trail =
                trailRepository.findByIdAndDeletedFalse(id);

        if (trail.isEmpty()) {
            return Optional.empty();
        }

        Map<UUID, Set<String>> sceneryByTrailId =
                getSceneryByTrailId(
                        List.of(id)
                );

        Map<UUID, Set<GearCategory>> gearRequirementsByTrailId =
                getGearRequirementsByTrailId(
                        List.of(id)
                );

        return trail.map(value ->
                toSummaryResponse(
                        value,
                        sceneryByTrailId.getOrDefault(
                                id,
                                Set.of()
                        ),
                        gearRequirementsByTrailId.getOrDefault(
                                id,
                                Set.of()
                        )
                )
        );
    }


    // ------------------------------------------------
    // Nearby trails
    // ------------------------------------------------

    public List<NearbyTrailResponse> getNearbyTrails(
            double latitude,
            double longitude,
            double radiusKm
    ) {

        double radiusMeters =
                radiusKm * 1000.0;

        List<NearbyTrailProjection> nearbyTrails =
                trailRepository.findNearbyTrails(
                        latitude,
                        longitude,
                        radiusMeters
                );

        if (nearbyTrails.isEmpty()) {
            return List.of();
        }

        List<UUID> trailIds =
                nearbyTrails.stream()
                        .map(NearbyTrailProjection::getId)
                        .toList();

        Map<UUID, Set<String>> sceneryByTrailId =
                getSceneryByTrailId(trailIds);

        Map<UUID, Set<GearCategory>> gearRequirementsByTrailId =
                getGearRequirementsByTrailId(trailIds);

        return nearbyTrails.stream()
                .map(trail ->
                        toNearbyResponse(
                                trail,
                                sceneryByTrailId.getOrDefault(
                                        trail.getId(),
                                        Set.of()
                                ),
                                gearRequirementsByTrailId.getOrDefault(
                                        trail.getId(),
                                        Set.of()
                                )
                        )
                )
                .toList();
    }


    // ------------------------------------------------
    // Trail detail
    // ------------------------------------------------

    public Optional<TrailDetailResponse> getTrailDetail(
            UUID id
    ) {

        Optional<TrailDetailProjection> trail =
                trailRepository.findTrailDetailById(id);

        if (trail.isEmpty()) {
            return Optional.empty();
        }

        Map<UUID, Set<String>> sceneryByTrailId =
                getSceneryByTrailId(List.of(id));

        Map<UUID, Set<GearCategory>> gearRequirementsByTrailId =
                getGearRequirementsByTrailId(List.of(id));

        return trail.map(value ->
                toDetailResponse(
                        value,
                        sceneryByTrailId.getOrDefault(
                                id,
                                Set.of()
                        ),
                        gearRequirementsByTrailId.getOrDefault(
                                id,
                                Set.of()
                        )
                )
        );
    }


    // ------------------------------------------------
    // Mapping
    // ------------------------------------------------

    private TrailSummaryResponse toSummaryResponse(
            Trail trail,
            Set<String> scenery,
            Set<GearCategory> baselineGearRequirements
    ) {

        return new TrailSummaryResponse(
                trail.getId(),
                trail.getName(),
                trail.getDescription(),
                trail.getDifficulty().name(),
                trail.getDistanceKm(),
                trail.getElevationGainM(),
                trail.getEstimatedDurationMin(),
                trail.getTrailhead().getY(),
                trail.getTrailhead().getX(),
                trail.getSource(),
                scenery,
                trail.getCoverImageUrl(),
                baselineGearRequirements
        );
    }


    private NearbyTrailResponse toNearbyResponse(
            NearbyTrailProjection trail,
            Set<String> scenery,
            Set<GearCategory> baselineGearRequirements
    ) {

        TrailSummaryResponse summary =
                new TrailSummaryResponse(
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
                        scenery,
                        trail.getCoverImageUrl(),
                        baselineGearRequirements
                );

        return new NearbyTrailResponse(
                summary,
                trail.getDistanceFromUserKm()
        );
    }


    private TrailDetailResponse toDetailResponse(
            TrailDetailProjection trail,
            Set<String> scenery,
            Set<GearCategory> baselineGearRequirements
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
                trail.getSource(),
                trail.getCoverImageUrl(),
                scenery,
                baselineGearRequirements
        );
    }


    // ------------------------------------------------
    // Scenery lookup
    // ------------------------------------------------

    private Map<UUID, Set<String>> getSceneryByTrailId(
            Collection<UUID> trailIds
    ) {

        if (trailIds.isEmpty()) {
            return Map.of();
        }

        return trailRepository
                .findSceneryByTrailIds(trailIds)
                .stream()
                .collect(
                        Collectors.groupingBy(
                                TrailSceneryProjection::getTrailId,
                                Collectors.mapping(
                                        TrailSceneryProjection::getScenery,
                                        Collectors.toSet()
                                )
                        )
                );
    }


    // ------------------------------------------------
    // Baseline gear lookup
    // ------------------------------------------------

    private Map<UUID, Set<GearCategory>>
    getGearRequirementsByTrailId(
            Collection<UUID> trailIds
    ) {

        if (trailIds.isEmpty()) {
            return Map.of();
        }

        return trailRepository
                .findGearRequirementsByTrailIds(
                        trailIds
                )
                .stream()
                .collect(
                        Collectors.groupingBy(
                                TrailGearRequirementProjection::getTrailId,
                                Collectors.mapping(
                                        requirement ->
                                                GearCategory.valueOf(
                                                        requirement
                                                                .getGearCategory()
                                                ),
                                        Collectors.toSet()
                                )
                        )
                );
    }


    // ------------------------------------------------
    // Helpers
    // ------------------------------------------------

    private String normalize(
            String value
    ) {

        if (value == null
                || value.isBlank()) {

            return null;
        }

        return value.trim();
    }


    private String normalizeDifficulty(
            String difficulty
    ) {

        if (difficulty == null
                || difficulty.isBlank()) {

            return null;
        }

        try {

            return TrailDifficulty
                    .valueOf(
                            difficulty
                                    .trim()
                                    .toUpperCase()
                    )
                    .name();

        } catch (IllegalArgumentException e) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "difficulty must be one of: EASY, MODERATE, HARD"
            );
        }
    }
}
