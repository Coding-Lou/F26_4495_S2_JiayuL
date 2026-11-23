package com.jay.outdoor.activity.dto;

import com.jay.outdoor.activity.entity.EventRegistration;
import com.jay.outdoor.activity.entity.RegistrationStatus;

import java.time.Instant;
import java.util.UUID;

public record EventRegistrationResponse(
        UUID id,
        UUID eventId,
        RegistrationStatus status,
        Instant createdAt
) {
    public static EventRegistrationResponse from(EventRegistration registration) {
        return new EventRegistrationResponse(
                registration.getId(),
                registration.getEventId(),
                registration.getStatus(),
                registration.getCreatedAt()
        );
    }
}