package com.jay.outdoor.user.dto;

import com.jay.outdoor.user.entity.GearCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateGearItemRequest(

        @NotBlank
        @Size(max = 100)
        String name,

        GearCategory category,

        @Size(max = 255)
        String description
) {}
