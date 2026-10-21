package com.jay.outdoor.recommendation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record PlannerTurnRequest(

        @NotBlank(message = "message is required")
        @Size(max = 2000, message = "message must not exceed 2000 characters")
        String message,

        @Valid
        PlanningContext context,

        @NotNull(message = "latitude is required")
        @DecimalMin(value = "-90.0", message = "latitude must be >= -90")
        @DecimalMax(value = "90.0", message = "latitude must be <= 90")
        Double latitude,

        @NotNull(message = "longitude is required")
        @DecimalMin(value = "-180.0", message = "longitude must be >= -180")
        @DecimalMax(value = "180.0", message = "longitude must be <= 180")
        Double longitude,

        @NotNull(message = "tripDate is required")
        LocalDate tripDate,

        @Positive(message = "radiusKm must be greater than 0")
        Double radiusKm
) {
}
