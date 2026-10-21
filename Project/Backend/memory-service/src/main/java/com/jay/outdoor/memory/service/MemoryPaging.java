package com.jay.outdoor.memory.service;

import com.jay.outdoor.memory.exception.RequestValidationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** page/size rules (D24) and the one list order: tripDate, createdAt, id, all descending. */
public final class MemoryPaging {

    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 50;

    static final Sort ORDER = Sort.by(
            Sort.Order.desc("tripDate"),
            Sort.Order.desc("createdAt"),
            Sort.Order.desc("id")
    );

    private MemoryPaging() {
    }

    public static Pageable of(int page, int size) {
        if (page < 0) {
            throw new RequestValidationException("page", "must be greater than or equal to 0");
        }
        if (size < 1 || size > MAX_SIZE) {
            throw new RequestValidationException("size", "must be between 1 and " + MAX_SIZE);
        }
        if ((long) page * size > Integer.MAX_VALUE) {
            throw new RequestValidationException("page", "is too large");
        }

        return PageRequest.of(page, size, ORDER);
    }
}
