package com.jay.outdoor.plan.integration;

import com.jay.outdoor.plan.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.LocalDate;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** The Flyway schema: columns only, the partial unique index, the status check (AC-09, AC-14). */
class PlanSchemaIntegrationTest extends AbstractIntegrationTest {

    private static final String INSERT =
            "INSERT INTO plans (id, owner_subject, trail_id, trip_date) VALUES (?, ?, ?, ?)";

    @Test
    void thePlansTableHasNoTrailWeatherOrGearColumns() {
        Set<String> columns = new TreeSet<>(jdbc.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'plans'",
                String.class));

        assertEquals(Set.of("id", "owner_subject", "trail_id", "trip_date", "status",
                "created_at", "updated_at", "deleted"), columns);
    }

    @Test
    void thePartialUniqueIndexExistsAndRejectsASecondActiveRow() {
        String definition = jdbc.queryForObject(
                "SELECT indexdef FROM pg_indexes WHERE indexname = 'uk_plans_owner_trail_date_active'",
                String.class);
        assertTrue(definition.startsWith("CREATE UNIQUE INDEX"), definition);
        assertTrue(definition.contains("(owner_subject, trail_id, trip_date)"), definition);
        assertTrue(definition.contains("WHERE (deleted = false)"), definition);

        UUID trail = UUID.randomUUID();
        LocalDate date = LocalDate.now();
        UUID first = UUID.randomUUID();
        jdbc.update(INSERT, first, "user-a", trail, date);

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update(INSERT, UUID.randomUUID(), "user-a", trail, date));

        // Other owners, trails, and dates are independent identities.
        assertDoesNotThrow(() -> jdbc.update(INSERT, UUID.randomUUID(), "user-b", trail, date));
        assertDoesNotThrow(() -> jdbc.update(INSERT, UUID.randomUUID(), "user-a", UUID.randomUUID(), date));
        assertDoesNotThrow(() -> jdbc.update(INSERT, UUID.randomUUID(), "user-a", trail, date.plusDays(1)));

        // A soft-deleted row no longer counts.
        jdbc.update("UPDATE plans SET deleted = TRUE WHERE id = ?", first);
        assertDoesNotThrow(() -> jdbc.update(INSERT, UUID.randomUUID(), "user-a", trail, date));
        assertEquals(2, jdbc.queryForObject(
                "SELECT count(*) FROM plans WHERE owner_subject = 'user-a' AND trail_id = ? AND trip_date = ?",
                Integer.class, trail, date));
    }

    @Test
    void defaultsAndTheStatusCheckHold() {
        UUID id = UUID.randomUUID();
        jdbc.update(INSERT, id, "user-a", UUID.randomUUID(), LocalDate.now());

        assertEquals("READY", jdbc.queryForObject("SELECT status FROM plans WHERE id = ?", String.class, id));
        assertEquals(false, jdbc.queryForObject("SELECT deleted FROM plans WHERE id = ?", Boolean.class, id));

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "INSERT INTO plans (id, owner_subject, trail_id, trip_date, status) VALUES (?, ?, ?, ?, 'COMPLETED')",
                UUID.randomUUID(), "user-a", UUID.randomUUID(), LocalDate.now()));
    }

    @Test
    void theListIndexExists() {
        String definition = jdbc.queryForObject(
                "SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_plans_owner_active'",
                String.class);
        assertTrue(definition.contains("(owner_subject, trip_date, created_at, id)"), definition);
        assertTrue(definition.contains("WHERE (deleted = false)"), definition);
    }
}
