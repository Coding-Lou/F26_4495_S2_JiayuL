package com.jay.outdoor.activity.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CreateGroupEventRequest(
        @NotNull UUID trailId,
        @NotBlank @Size(max = 160) String title,
        @Size(max = 2000) String description,
        @NotNull @Min(1) Integer capacity,
        @NotNull Instant registrationOpensAt,
        @NotNull Instant registrationClosesAt,
        @NotNull Instant startsAt,
        @NotNull Instant endsAt
) {

}
