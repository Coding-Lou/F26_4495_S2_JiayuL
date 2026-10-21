package com.jay.outdoor.plan.service;

import com.jay.outdoor.plan.exception.RequestValidationException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** The tripDate rule against a fixed server clock (spec section 15). */
class PlanFieldRulesTest {

    private static final ZoneId VANCOUVER = ZoneId.of("America/Vancouver");

    // 2026-10-19 23:30 in Vancouver is already 2026-10-20 in UTC.
    private final PlanFieldRules rules = new PlanFieldRules(
            Clock.fixed(Instant.parse("2026-10-20T06:30:00Z"), VANCOUVER));

    @Test
    void todayAndLaterAreAcceptedWithNoMaximum() {
        assertDoesNotThrow(() -> rules.validateTripDate(LocalDate.of(2026, 10, 19)));
        assertDoesNotThrow(() -> rules.validateTripDate(LocalDate.of(2026, 10, 20)));
        assertDoesNotThrow(() -> rules.validateTripDate(LocalDate.of(2030, 1, 1)));
    }

    @Test
    void aDateBeforeTheServersLocalTodayIsRefusedOnTripDate() {
        RequestValidationException ex = assertThrows(RequestValidationException.class,
                () -> rules.validateTripDate(LocalDate.of(2026, 10, 18)));

        assertEquals(1, ex.getErrors().size());
        assertEquals("tripDate", ex.getErrors().getFirst().field());
        assertEquals("must not be in the past", ex.getErrors().getFirst().message());
    }

    @Test
    void aMissingDateIsRefusedOnTripDate() {
        RequestValidationException ex = assertThrows(RequestValidationException.class,
                () -> rules.validateTripDate(null));

        assertEquals("tripDate", ex.getErrors().getFirst().field());
    }
}
