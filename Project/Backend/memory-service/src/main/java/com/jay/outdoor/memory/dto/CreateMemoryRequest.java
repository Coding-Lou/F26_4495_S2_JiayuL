package com.jay.outdoor.memory.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.jay.outdoor.memory.entity.MemoryVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Unknown properties (for example userId, ownerSubject, id, deleted, createdAt)
 * are ignored: the owner and the server fields are never taken from a client.
 * The title's 120-character limit applies after trimming and the tripDate rule
 * is checked in the service.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CreateMemoryRequest(

        @NotNull
        UUID trailId,

        @NotNull
        LocalDate tripDate,

        @NotBlank
        String title,

        @Size(max = 5000)
        String story,

        MemoryVisibility visibility
) {
}
