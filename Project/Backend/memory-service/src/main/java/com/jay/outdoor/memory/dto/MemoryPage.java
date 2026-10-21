package com.jay.outdoor.memory.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/** The project's page envelope; Spring Data's Page JSON is not a stable contract. */
public record MemoryPage<T>(
        List<T> items,
        int page,
        int size,
        long totalItems,
        int totalPages
) {

    public static <T> MemoryPage<T> of(Page<?> source, List<T> items) {
        return new MemoryPage<>(
                items,
                source.getNumber(),
                source.getSize(),
                source.getTotalElements(),
                source.getTotalPages()
        );
    }
}
