package com.jay.outdoor.plan.integration;

import com.jay.outdoor.plan.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Owner list, detail, delete, and cross-user isolation (AC-10, 11, 12, 21). */
class PlanReadDeleteIntegrationTest extends AbstractIntegrationTest {

    private static final Set<String> PAGE = Set.of("items", "page", "size", "totalItems", "totalPages");

    // ---------------------------------------------------------------- list

    @Test
    void theListHoldsOnlyTheCallersActivePlansPastAndUpcoming() throws Exception {
        UUID upcoming = createPlan("user-a", TRAIL, today().plusDays(4));
        UUID deleted = createPlan("user-a", OTHER_TRAIL, today().plusDays(4));
        UUID past = insertDirectly("user-a", TRAIL, today().minusDays(10));
        createPlan("user-b", TRAIL, today().plusDays(4));
        mockMvc.perform(delete("/api/plans/{id}", deleted).with(userA()))
                .andExpect(status().isNoContent());
        clearInvocations(trailCatalogClient);

        MvcResult result = mockMvc.perform(get("/api/plans").with(userA()))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode page = json(result);
        assertEquals(PAGE, fieldNames(page));
        assertEquals(List.of(past, upcoming), ids(page));
        assertEquals(0, page.get("page").asInt());
        assertEquals(20, page.get("size").asInt());
        assertEquals(2, page.get("totalItems").asLong());
        assertEquals(1, page.get("totalPages").asInt());
        assertFalse(result.getResponse().getContentAsString().contains("user-"));

        MvcResult other = mockMvc.perform(get("/api/plans").with(userB()))
                .andExpect(status().isOk())
                .andReturn();
        assertEquals(1, json(other).get("totalItems").asLong());
        assertFalse(ids(json(other)).contains(upcoming));
        assertFalse(ids(json(other)).contains(past));

        verify(trailCatalogClient, never()).trailExists(any());
    }

    @Test
    void theListIsOrderedByTripDateThenCreatedAtThenId() throws Exception {
        LocalDate d1 = today().plusDays(1);
        LocalDate d2 = today().plusDays(2);
        OffsetDateTime t = OffsetDateTime.parse("2026-10-01T10:00:00Z");

        UUID lateSecond = insertDirectly("user-a", TRAIL, d2, t.plusMinutes(5),
                UUID.fromString("00000000-0000-0000-0000-000000000001"));
        UUID lateFirst = insertDirectly("user-a", OTHER_TRAIL, d2, t,
                UUID.fromString("00000000-0000-0000-0000-000000000002"));
        UUID tieHigh = insertDirectly("user-a", TRAIL, d1, t,
                UUID.fromString("ffffffff-0000-0000-0000-000000000000"));
        UUID tieLow = insertDirectly("user-a", OTHER_TRAIL, d1, t,
                UUID.fromString("0fffffff-0000-0000-0000-000000000000"));
        UUID pastOne = insertDirectly("user-a", TRAIL, today().minusDays(30), t.plusDays(9),
                UUID.randomUUID());

        MvcResult result = mockMvc.perform(get("/api/plans").with(userA()))
                .andExpect(status().isOk())
                .andReturn();

        assertEquals(List.of(pastOne, tieLow, tieHigh, lateFirst, lateSecond), ids(json(result)));
    }

    @Test
    void theListIsPagedWithAMaximumSizeOf50() throws Exception {
        List<UUID> created = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            created.add(createPlan("user-a", TRAIL, today().plusDays(i)));
        }

        MvcResult second = mockMvc.perform(get("/api/plans").with(userA())
                        .param("page", "1").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalItems").value(5))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andReturn();
        assertEquals(created.subList(2, 4), ids(json(second)));

        mockMvc.perform(get("/api/plans").with(userA()).param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(5)));
        mockMvc.perform(get("/api/plans").with(userA()).param("page", "9"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)));

        expectPagingError("size", "51", "size");
        expectPagingError("size", "0", "size");
        expectPagingError("page", "-1", "page");
        expectPagingError("page", String.valueOf(Integer.MAX_VALUE), "page");

        for (Map.Entry<String, String> bad : List.of(Map.entry("page", "x"), Map.entry("size", "1.5"))) {
            MvcResult result = mockMvc.perform(get("/api/plans").with(userA())
                            .param(bad.getKey(), bad.getValue()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andReturn();
            assertFalse(json(result).has("errors"));
        }
    }

    // ---------------------------------------------------------------- detail

    @Test
    void theOwnerReadsTheirPlanWithTheSameBodyAsTheCreate() throws Exception {
        MvcResult created = postPlan(userA(), planJson(TRAIL, today().plusDays(1)))
                .andExpect(status().isCreated())
                .andReturn();
        UUID id = UUID.fromString(json(created).get("id").asString());
        clearInvocations(trailCatalogClient);

        MvcResult detail = mockMvc.perform(get("/api/plans/{id}", id).with(userA()))
                .andExpect(status().isOk())
                .andReturn();

        assertEquals(json(created), json(detail));
        verify(trailCatalogClient, never()).trailExists(any());
    }

    @Test
    void foreignDeletedAndUnknownPlansAreTheSame404() throws Exception {
        UUID mine = createPlan("user-a", TRAIL, today());
        UUID gone = createPlan("user-a", OTHER_TRAIL, today());
        mockMvc.perform(delete("/api/plans/{id}", gone).with(userA()))
                .andExpect(status().isNoContent());

        JsonNode foreign = withoutInstance(mockMvc.perform(get("/api/plans/{id}", mine).with(userB()))
                .andExpect(status().isNotFound()).andReturn());
        JsonNode deleted = withoutInstance(mockMvc.perform(get("/api/plans/{id}", gone).with(userA()))
                .andExpect(status().isNotFound()).andReturn());
        JsonNode unknown = withoutInstance(mockMvc.perform(get("/api/plans/{id}", UUID.randomUUID())
                        .with(userA()))
                .andExpect(status().isNotFound()).andReturn());

        assertEquals("PLAN_NOT_FOUND", foreign.get("code").asString());
        assertEquals(foreign, deleted);
        assertEquals(foreign, unknown);
    }

    @Test
    void aNonUuidIdIsAValidationError() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/plans/{id}", "not-a-uuid").with(userA()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andReturn();
        assertFalse(json(result).has("errors"));

        mockMvc.perform(delete("/api/plans/{id}", "not-a-uuid").with(userA()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    // ---------------------------------------------------------------- delete

    @Test
    void theOwnerSoftDeletesAndASecondDeleteIs404() throws Exception {
        UUID id = createPlan("user-a", TRAIL, today().plusDays(1));
        OffsetDateTime createdAt = jdbc.queryForObject(
                "SELECT created_at FROM plans WHERE id = ?", OffsetDateTime.class, id);
        clearInvocations(trailCatalogClient);

        MvcResult deleted = mockMvc.perform(delete("/api/plans/{id}", id).with(userA()))
                .andExpect(status().isNoContent())
                .andReturn();
        assertEquals("", deleted.getResponse().getContentAsString());

        Map<String, Object> row = jdbc.queryForMap("SELECT * FROM plans WHERE id = ?", id);
        assertEquals(true, row.get("deleted"));
        OffsetDateTime updatedAt = jdbc.queryForObject(
                "SELECT updated_at FROM plans WHERE id = ?", OffsetDateTime.class, id);
        assertFalse(updatedAt.isBefore(createdAt));

        mockMvc.perform(get("/api/plans").with(userA()))
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(get("/api/plans/{id}", id).with(userA()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PLAN_NOT_FOUND"));
        mockMvc.perform(delete("/api/plans/{id}", id).with(userA()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PLAN_NOT_FOUND"));

        verify(trailCatalogClient, never()).trailExists(any());
    }

    @Test
    void anotherUsersDeleteIs404AndLeavesTheRowUnchanged() throws Exception {
        UUID id = createPlan("user-a", TRAIL, today());
        Map<String, Object> before = jdbc.queryForMap("SELECT * FROM plans WHERE id = ?", id);

        mockMvc.perform(delete("/api/plans/{id}", id).with(userB()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PLAN_NOT_FOUND"));
        mockMvc.perform(delete("/api/plans/{id}", UUID.randomUUID()).with(userA()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PLAN_NOT_FOUND"));

        assertEquals(before, jdbc.queryForMap("SELECT * FROM plans WHERE id = ?", id));
        mockMvc.perform(get("/api/plans/{id}", id).with(userA()))
                .andExpect(status().isOk());
    }

    // ---------------------------------------------------------------- not provided

    @Test
    void thereIsNoUpdateAndUnknownPathsAre404() throws Exception {
        UUID id = createPlan("user-a", TRAIL, today());
        String body = planJson(OTHER_TRAIL, today().plusDays(1));

        mockMvc.perform(put("/api/plans/{id}", id).with(userA())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
        mockMvc.perform(patch("/api/plans/{id}", id).with(userA())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
        mockMvc.perform(get("/api/plans/{id}/restore", id).with(userA()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        Map<String, Object> row = jdbc.queryForMap("SELECT * FROM plans WHERE id = ?", id);
        assertEquals(TRAIL, row.get("trail_id"));
        assertEquals(java.sql.Date.valueOf(today()), row.get("trip_date"));
    }

    // ---------------------------------------------------------------- helpers

    private void expectPagingError(String param, String value, String field) throws Exception {
        mockMvc.perform(get("/api/plans").with(userA()).param(param, value))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value(field));
    }

    private UUID insertDirectly(String owner, UUID trailId, LocalDate tripDate) {
        return insertDirectly(owner, trailId, tripDate, OffsetDateTime.now(), UUID.randomUUID());
    }

    /** Past Plans cannot be created through the API; they appear when a date passes. */
    private UUID insertDirectly(
            String owner,
            UUID trailId,
            LocalDate tripDate,
            OffsetDateTime createdAt,
            UUID id
    ) {
        jdbc.update("""
                        INSERT INTO plans (id, owner_subject, trail_id, trip_date, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?)""",
                id, owner, trailId, tripDate, createdAt, createdAt);
        return id;
    }

    private static List<UUID> ids(JsonNode page) {
        List<UUID> ids = new ArrayList<>();
        page.get("items").forEach(item -> ids.add(UUID.fromString(item.get("id").asString())));
        return ids;
    }
}
