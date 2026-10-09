package com.jay.outdoor.trail.repository;

import java.util.UUID;

public interface TrailDetailProjection {

    UUID getId();

    String getName();

    String getDescription();

    String getDifficulty();

    Double getDistanceKm();

    Integer getElevationGainM();

    Integer getEstimatedDurationMin();

    Double getLatitude();

    Double getLongitude();

    String getRouteGeoJson();

    String getSource();
}