package com.jay.outdoor.plan.service;

import com.jay.outdoor.plan.exception.RequestValidationException;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;

/**
 * The tripDate rule of spec section 15, applied after Bean Validation: today or
 * later against the server's local date (the pack request's rule), no maximum.
 * The injected Clock lets tests fix "today".
 */
@Component
public class PlanFieldRules {

    private final Clock clock;

    public PlanFieldRules(Clock clock) {
        this.clock = clock;
    }

    public void validateTripDate(LocalDate tripDate) {
        if (tripDate == null) {
            throw new RequestValidationException("tripDate", "must not be null");
        }
        if (tripDate.isBefore(LocalDate.now(clock))) {
            throw new RequestValidationException("tripDate", "must not be in the past");
        }
    }
}
