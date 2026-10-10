package com.jay.outdoor.trail.entity;

import jakarta.persistence.*;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.Point;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "trails")
public class Trail {

    @Id
    private UUID id;

    @Column(
            nullable = false,
            length = 200
    )
    private String name;

    @Column(
            columnDefinition = "TEXT"
    )
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(
            nullable = false,
            length = 20
    )
    private TrailDifficulty difficulty;

    @Column(
            name = "distance_km",
            nullable = false
    )
    private double distanceKm;

    @Column(
            name = "elevation_gain_m"
    )
    private Integer elevationGainM;

    @Column(
            name = "estimated_duration_min"
    )
    private Integer estimatedDurationMin;

    @Column(
            nullable = false,
            columnDefinition = "geometry(Point,4326)"
    )
    private Point trailhead;

    @Column(
            columnDefinition = "geometry(Geometry,4326)"
    )
    private Geometry route;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "trail_scenery",
            joinColumns = @JoinColumn(
                    name = "trail_id"
            )
    )
    @Column(
            name = "scenery",
            nullable = false,
            length = 30
    )
    @Enumerated(EnumType.STRING)
    private Set<TrailScenery> scenery =
            new HashSet<>();

    @Column(
            length = 100
    )
    private String source;

    @Column(
            name = "created_at",
            nullable = false
    )
    private OffsetDateTime createdAt;

    @Column(
            name = "updated_at",
            nullable = false
    )
    private OffsetDateTime updatedAt;

    @Column(
            nullable = false
    )
    private boolean deleted = false;

    public Trail() {
    }

    @PrePersist
    public void prePersist() {

        if (id == null) {
            id = UUID.randomUUID();
        }

        OffsetDateTime now =
                OffsetDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt =
                OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(
            String name
    ) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(
            String description
    ) {
        this.description = description;
    }

    public TrailDifficulty getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(
            TrailDifficulty difficulty
    ) {
        this.difficulty = difficulty;
    }

    public double getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(
            double distanceKm
    ) {
        this.distanceKm = distanceKm;
    }

    public Integer getElevationGainM() {
        return elevationGainM;
    }

    public void setElevationGainM(
            Integer elevationGainM
    ) {
        this.elevationGainM =
                elevationGainM;
    }

    public Integer getEstimatedDurationMin() {
        return estimatedDurationMin;
    }

    public void setEstimatedDurationMin(
            Integer estimatedDurationMin
    ) {
        this.estimatedDurationMin =
                estimatedDurationMin;
    }

    public Point getTrailhead() {
        return trailhead;
    }

    public void setTrailhead(
            Point trailhead
    ) {
        this.trailhead = trailhead;
    }

    public Geometry getRoute() {
        return route;
    }

    public void setRoute(
            Geometry route
    ) {
        this.route = route;
    }

    public Set<TrailScenery> getScenery() {
        return scenery;
    }

    public void setScenery(
            Set<TrailScenery> scenery
    ) {
        this.scenery = scenery;
    }

    public String getSource() {
        return source;
    }

    public void setSource(
            String source
    ) {
        this.source = source;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(
            OffsetDateTime createdAt
    ) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(
            OffsetDateTime updatedAt
    ) {
        this.updatedAt = updatedAt;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(
            boolean deleted
    ) {
        this.deleted = deleted;
    }
}