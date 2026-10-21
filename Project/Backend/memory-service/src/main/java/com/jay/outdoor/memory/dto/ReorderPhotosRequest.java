package com.jay.outdoor.memory.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ReorderPhotosRequest(

        @NotNull
        List<UUID> photoIds
) {
}
