package com.jay.outdoor.recommendation.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record PackRecommendationRequest(

        @NotNull
        UUID trailId,

        @NotNull
        @FutureOrPresent
        LocalDate tripDate

) {
}