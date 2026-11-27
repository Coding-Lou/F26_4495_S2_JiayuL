package com.jay.outdoor.activity.dto;

import com.jay.outdoor.activity.entity.EventRegistration;
import java.util.Objects;

public record MyRegistrationStatusResponse(
        Status status,
        EventRegistrationResponse registration
) {
    public enum Status {
        CONFIRMED,
        PENDING,
        QUEUED,
        REVIEW,
        WAITLISTED,
        NOT_REGISTERED
    }

    public static MyRegistrationStatusResponse fromRegistration(EventRegistration registration) {
        Objects.requireNonNull(registration, "registration");
        Status status = switch (registration.getStatus()) {
            case CONFIRMED -> Status.CONFIRMED;
            case PENDING -> Status.PENDING;
            case REVIEW -> Status.REVIEW;
            case WAITLISTED -> Status.WAITLISTED;
            case CANCELLED, FAILED -> throw new IllegalArgumentException("Registration is not active");
        };
        return new MyRegistrationStatusResponse(status, EventRegistrationResponse.from(registration));
    }

    public static MyRegistrationStatusResponse queued() {
        return new MyRegistrationStatusResponse(Status.QUEUED, null);
    }

    public static MyRegistrationStatusResponse notRegistered() {
        return new MyRegistrationStatusResponse(Status.NOT_REGISTERED, null);
    }
}
