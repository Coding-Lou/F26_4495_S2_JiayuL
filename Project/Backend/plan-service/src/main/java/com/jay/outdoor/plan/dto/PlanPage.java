package com.jay.outdoor.plan.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/** The project's page envelope; Spring Data's Page JSON is not a stable contract. */
public record PlanPage(
        List<PlanResponse> items,
        int page,
        int size,
        long totalItems,
        int totalPages
) {

    public static PlanPage of(Page<?> source, List<PlanResponse> items) {
        return new PlanPage(
                items,
                source.getNumber(),
                source.getSize(),
                source.getTotalElements(),
                source.getTotalPages()
        );
    }
}
