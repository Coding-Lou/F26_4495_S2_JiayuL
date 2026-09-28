package com.jay.outdoor.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateGearItemRequest(

        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 50)
        String category,

        @Size(max = 255)
        String description
) {}