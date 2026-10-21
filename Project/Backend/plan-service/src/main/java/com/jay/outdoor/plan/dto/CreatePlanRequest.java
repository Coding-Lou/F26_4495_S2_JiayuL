package com.jay.outdoor.plan.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Unknown properties (for example ownerSubject, id, status, deleted, createdAt)
 * are ignored: the owner and the server fields are never taken from a client.
 * The tripDate rule (today or later) is checked in the service against the
 * injected Clock.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CreatePlanRequest(

        @NotNull
        UUID trailId,

        @NotNull
        LocalDate tripDate
) {
}
