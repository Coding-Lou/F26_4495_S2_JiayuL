package com.jay.outdoor.memory.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.jay.outdoor.memory.entity.MemoryVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Full replacement of the editable fields. There is no trailId: one sent anyway
 * is ignored (D9). Visibility is required so that an omitted field can never
 * change a Memory's sharing state.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record UpdateMemoryRequest(

        @NotNull
        LocalDate tripDate,

        @NotBlank
        String title,

        @Size(max = 5000)
        String story,

        @NotNull
        MemoryVisibility visibility
) {
}
