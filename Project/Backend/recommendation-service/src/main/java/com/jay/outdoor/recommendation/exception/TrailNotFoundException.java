package com.jay.outdoor.recommendation.exception;

import java.util.UUID;

public class TrailNotFoundException extends RuntimeException {

    public TrailNotFoundException(UUID trailId) {
        super("Trail not found: " + trailId);
    }
}