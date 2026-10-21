package com.jay.outdoor.trail.repository;

import java.util.UUID;

public interface TrailGearRequirementProjection {

    UUID getTrailId();

    String getGearCategory();
}