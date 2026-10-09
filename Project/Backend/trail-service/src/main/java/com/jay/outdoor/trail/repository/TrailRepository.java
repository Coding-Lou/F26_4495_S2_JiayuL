package com.jay.outdoor.trail.repository;

import com.jay.outdoor.trail.entity.Trail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrailRepository extends JpaRepository<Trail, UUID> {

    // Get all active trails
    List<Trail> findAllByDeletedFalse();

    // Get trail by ID
    Optional<Trail> findByIdAndDeletedFalse(UUID id);

    // Find trails within a given radius
    @Query(value = """
        SELECT
            t.id AS id,
            t.name AS name,
            t.description AS description,
            t.difficulty AS difficulty,
            t.distance_km AS distanceKm,
            t.elevation_gain_m AS elevationGainM,
            t.estimated_duration_min AS estimatedDurationMin,
            ST_Y(t.trailhead) AS latitude,
            ST_X(t.trailhead) AS longitude,
            t.source AS source,

            ST_Distance(
                CAST(t.trailhead AS geography),
                CAST(
                    ST_SetSRID(
                        ST_MakePoint(:longitude, :latitude),
                        4326
                    ) AS geography
                )
            ) / 1000.0 AS distanceFromUserKm

        FROM trails t

        WHERE t.deleted = false
          AND ST_DWithin(
              CAST(t.trailhead AS geography),
              CAST(
                  ST_SetSRID(
                      ST_MakePoint(:longitude, :latitude),
                      4326
                  ) AS geography
              ),
              :radiusMeters
          )

        ORDER BY distanceFromUserKm
        """, nativeQuery = true)
    List<NearbyTrailProjection> findNearbyTrails(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radiusMeters") double radiusMeters
    );

    @Query(value = """
        SELECT *
        FROM trails t
        WHERE t.deleted = false
          AND (
              :search IS NULL
              OR LOWER(t.name) LIKE LOWER(CONCAT('%', :search, '%'))
          )
          AND (
              :difficulty IS NULL
              OR t.difficulty = :difficulty
          )
          AND (
              :maxDistanceKm IS NULL
              OR t.distance_km <= :maxDistanceKm
          )
          AND (
              :maxElevationGainM IS NULL
              OR t.elevation_gain_m <= :maxElevationGainM
          )
        ORDER BY t.name
        """, nativeQuery = true)
    List<Trail> searchTrails(
            @Param("search") String search,
            @Param("difficulty") String difficulty,
            @Param("maxDistanceKm") Double maxDistanceKm,
            @Param("maxElevationGainM") Integer maxElevationGainM
    );

    @Query(value = """
        SELECT
            t.id AS id,
            t.name AS name,
            t.description AS description,
            t.difficulty AS difficulty,
            t.distance_km AS distanceKm,
            t.elevation_gain_m AS elevationGainM,
            t.estimated_duration_min AS estimatedDurationMin,

            ST_Y(t.trailhead) AS latitude,
            ST_X(t.trailhead) AS longitude,

            ST_AsGeoJSON(t.route) AS routeGeoJson,

            t.source AS source

        FROM trails t

        WHERE t.id = :id
          AND t.deleted = false
        """, nativeQuery = true)
    Optional<TrailDetailProjection> findTrailDetailById(
            @Param("id") UUID id
    );

}