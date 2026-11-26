package com.jay.outdoor.activity.entity;

import java.util.List;

public enum RegistrationStatus {
    CONFIRMED,
    CANCELLED,
    WAITLISTED,
    PENDING,
    FAILED,
    REVIEW;

    public static final List<RegistrationStatus> ACTIVE_STATUSES =
            List.of(CONFIRMED, PENDING, REVIEW, WAITLISTED);
}
