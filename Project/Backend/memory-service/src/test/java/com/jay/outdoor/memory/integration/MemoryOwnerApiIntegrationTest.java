package com.jay.outdoor.memory.integration;

import com.jay.outdoor.memory.exception.TrailServiceUnavailableException;
import com.jay.outdoor.memory.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Owner CRUD, validation, trail validation, and error shapes (AC-02 to AC-10, AC-30). */
class MemoryOwnerApiIntegrationTest extends AbstractIntegrationTest {

    // ---------------------------------------------------------------- AC-02

    @Test
    void createReturnsDetailWithTokenOwnerDefaultPrivateAndTrimmedTitle() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/memories")
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(memoryJson(TRAIL, today(), "   Quarry Rock at dawn  ",
                                "Foggy start.", null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.trailId").value(TRAIL.toString()))
                .andExpect(jsonPath("$.tripDate").value(today().toString()))
                .andExpect(jsonPath("$.title").value("Quarry Rock at dawn"))
                .andExpect(jsonPath("$.story").value("Foggy start."))
                .andExpect(jsonPath("$.visibility").value("PRIVATE"))
                .andExpect(jsonPath("$.photos", hasSize(0)))
                .andReturn();

        UUID id = UUID.fromString(json(result).get("id").asString());
        Map<String, Object> row = jdbc.queryForMap("SELECT * FROM memories WHERE id = ?", id);

        assertEquals("user-a", row.get("owner_subject"));
        assertEquals("Quarry Rock at dawn", row.get("title"));
        assertEquals("PRIVATE", row.get("visibility"));
        assertEquals(false, row.get("deleted"));
        verify(trailCatalogClient).trailExists(TRAIL);
    }

    @Test
    void createHonoursAnExplicitPublicVisibility() throws Exception {
        mockMvc.perform(post("/api/memories")
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(memoryJson(TRAIL, today(), "Shared", null, "PUBLIC")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.visibility").value("PUBLIC"));
    }

    // ---------------------------------------------------------------- AC-03

    @Test
    void clientSuppliedServerFieldsHaveNoEffectOnCreateOrUpdate() throws Exception {
        UUID forgedId = UUID.fromString("99999999-9999-9999-9999-999999999999");
        String forged = """
                ,"id":"%s","userId":"%s","ownerSubject":"user-b","deleted":true,
                "createdAt":"2000-01-01T00:00:00Z","updatedAt":"2000-01-01T00:00:00Z"}"""
                .formatted(forgedId, UUID.randomUUID());

        String createBody = memoryJson(TRAIL, today(), "Forged", null, null);
        createBody = createBody.substring(0, createBody.length() - 1) + forged;

        UUID id = createMemory("user-a", createBody);
        assertNotEquals(forgedId, id);

        String updateBody = updateJson(today(), "Forged again", null, "PRIVATE");
        updateBody = updateBody.substring(0, updateBody.length() - 1) + forged;

        mockMvc.perform(put("/api/memories/{id}", id)
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));

        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM memories");
        assertEquals(1, rows.size());
        Map<String, Object> row = rows.getFirst();
        assertEquals(id, row.get("id"));
        assertEquals("user-a", row.get("owner_subject"));
        assertEquals(false, row.get("deleted"));
        assertTrue(((Timestamp) row.get("created_at")).toLocalDateTime().getYear() > 2000);
        assertTrue(((Timestamp) row.get("updated_at")).toLocalDateTime().getYear() > 2000);
        assertEquals(0, jdbc.queryForObject(
                "SELECT count(*) FROM memories WHERE id = ?", Integer.class, forgedId));
    }

    // ---------------------------------------------------------------- AC-04

    @Test
    void titleMustBePresentNotBlankAndAtMost120CharactersAfterTrimming() throws Exception {
        String missingTitle = "{\"trailId\":\"" + TRAIL + "\",\"tripDate\":\"" + today() + "\"}";
        expectFieldError(post("/api/memories"), missingTitle, "title");
        expectFieldError(post("/api/memories"), memoryJson(TRAIL, today(), "", null, null), "title");
        expectFieldError(post("/api/memories"), memoryJson(TRAIL, today(), "   \t ", null, null), "title");
        expectFieldError(post("/api/memories"),
                memoryJson(TRAIL, today(), "x".repeat(121), null, null), "title");

        UUID accepted = createMemory("user-a",
                memoryJson(TRAIL, today(), "  " + "y".repeat(120) + "  ", null, null));
        assertEquals("y".repeat(120), jdbc.queryForObject(
                "SELECT title FROM memories WHERE id = ?", String.class, accepted));
        assertEquals(1, count());
    }

    @Test
    void storyIsOptionalAtMost5000AndBlankIsStoredAsNull() throws Exception {
        UUID noStory = createMemory("user-a", memoryJson(TRAIL, today(), "No story", null, null));
        UUID longest = createMemory("user-a",
                memoryJson(TRAIL, today(), "Long", "s".repeat(5000), null));
        UUID blank = createMemory("user-a", memoryJson(TRAIL, today(), "Blank", "   \n ", null));
        UUID empty = createMemory("user-a", memoryJson(TRAIL, today(), "Empty", "", null));

        expectFieldError(post("/api/memories"),
                memoryJson(TRAIL, today(), "Too long", "s".repeat(5001), null), "story");

        assertNull(story(noStory));
        assertEquals(5000, story(longest).length());
        assertNull(story(blank));
        assertNull(story(empty));
        assertEquals(4, count());

        mockMvc.perform(get("/api/memories/{id}", blank).with(userA()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.story").isEmpty());
    }

    // ---------------------------------------------------------------- AC-05

    @Test
    void tripDateIsRequiredAndAtMostOneDayAheadAsATimeZoneAllowance() throws Exception {
        String missingDate = "{\"trailId\":\"" + TRAIL + "\",\"title\":\"No date\"}";
        expectFieldError(post("/api/memories"), missingDate, "tripDate");
        expectFieldError(post("/api/memories"),
                memoryJson(TRAIL, today().plusDays(2), "Too far", null, null), "tripDate");
        assertEquals(0, count());

        createMemory("user-a", memoryJson(TRAIL, today(), "Today", null, null));
        createMemory("user-a", memoryJson(TRAIL, LocalDate.of(2024, 7, 14), "Past", null, null));
        // Server today + 1 is accepted only as a time-zone boundary allowance (D10).
        createMemory("user-a", memoryJson(TRAIL, today().plusDays(1), "Allowance", null, null));
        assertEquals(3, count());
    }

    // ---------------------------------------------------------------- AC-06

    @Test
    void createForAMissingOrDeletedTrailIsBadRequestAndWritesNothing() throws Exception {
        when(trailCatalogClient.trailExists(TRAIL)).thenReturn(false);

        mockMvc.perform(post("/api/memories")
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(memoryJson(TRAIL, today(), "Ghost trail", null, null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("TRAIL_NOT_FOUND"));

        assertEquals(0, count());
    }

    @Test
    void createWhenTrailServiceCannotAnswerIsServiceUnavailableAndWritesNothing() throws Exception {
        when(trailCatalogClient.trailExists(TRAIL)).thenThrow(new TrailServiceUnavailableException());

        mockMvc.perform(post("/api/memories")
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(memoryJson(TRAIL, today(), "Outage", null, null)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("TRAIL_SERVICE_UNAVAILABLE"));

        assertEquals(0, count());
    }

    // ---------------------------------------------------------------- AC-07

    @Test
    void ownerListReturnsOnlyOwnNonDeletedMemoriesInOrderWithPaging() throws Exception {
        UUID older = createMemory("user-a", TRAIL, today().minusDays(10), "Older", "PRIVATE");
        UUID newest = createMemory("user-a", OTHER_TRAIL, today(), "Newest", "PUBLIC");
        UUID middle = createMemory("user-a", TRAIL, today().minusDays(3), "Middle", "PUBLIC");
        UUID deleted = createMemory("user-a", TRAIL, today().minusDays(1), "Deleted", "PRIVATE");
        createMemory("user-b", TRAIL, today(), "Not mine", "PUBLIC");

        mockMvc.perform(delete("/api/memories/{id}", deleted).with(userA()))
                .andExpect(status().isNoContent());
        clearInvocations(trailCatalogClient);

        JsonNode page = json(mockMvc.perform(get("/api/memories").with(userA()))
                .andExpect(status().isOk())
                .andReturn());

        assertEquals(List.of(newest, middle, older), ids(page.get("items")));
        assertEquals(0, page.get("page").asInt());
        assertEquals(20, page.get("size").asInt());
        assertEquals(3, page.get("totalItems").asInt());
        assertEquals(1, page.get("totalPages").asInt());

        JsonNode first = json(mockMvc.perform(get("/api/memories?page=0&size=2").with(userA()))
                .andExpect(status().isOk()).andReturn());
        assertEquals(List.of(newest, middle), ids(first.get("items")));
        assertEquals(3, first.get("totalItems").asInt());
        assertEquals(2, first.get("totalPages").asInt());

        JsonNode second = json(mockMvc.perform(get("/api/memories?page=1&size=2").with(userA()))
                .andExpect(status().isOk()).andReturn());
        assertEquals(List.of(older), ids(second.get("items")));

        mockMvc.perform(get("/api/memories?size=50&unknown=1").with(userA()))
                .andExpect(status().isOk());

        verify(trailCatalogClient, never()).trailExists(any());
    }

    @Test
    void ownerListBreaksTiesByCreatedAtThenIdDescending() throws Exception {
        LocalDate date = LocalDate.of(2025, 6, 1);
        OffsetDateTime earlier = OffsetDateTime.parse("2025-06-02T10:00:00Z");
        OffsetDateTime later = OffsetDateTime.parse("2025-06-02T11:00:00Z");
        UUID lowId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID highId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        UUID laterId = UUID.fromString("00000000-0000-0000-0000-000000000000");

        insertMemory(lowId, "user-a", date, earlier, "PRIVATE");
        insertMemory(highId, "user-a", date, earlier, "PRIVATE");
        insertMemory(laterId, "user-a", date, later, "PRIVATE");

        JsonNode page = json(mockMvc.perform(get("/api/memories").with(userA()))
                .andExpect(status().isOk()).andReturn());

        assertEquals(List.of(laterId, highId, lowId), ids(page.get("items")));
    }

    @Test
    void ownerListRejectsOutOfRangePaging() throws Exception {
        for (String query : List.of("size=51", "size=0", "page=-1", "size=abc", "page=1.5")) {
            mockMvc.perform(get("/api/memories?" + query).with(userA()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }
    }

    // ---------------------------------------------------------------- AC-08

    @Test
    void ownerReadsOwnPrivateMemoryWithStoryAndPhotosInPositionOrder() throws Exception {
        UUID id = createMemory("user-a",
                memoryJson(TRAIL, today(), "Private walk", "Just for me.", "PRIVATE"));
        UUID first = addPhoto(id);
        UUID second = addPhoto(id);
        clearInvocations(trailCatalogClient);

        JsonNode detail = json(mockMvc.perform(get("/api/memories/{id}", id).with(userA()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visibility").value("PRIVATE"))
                .andExpect(jsonPath("$.story").value("Just for me."))
                .andReturn());

        assertEquals(List.of(first, second), ids(detail.get("photos")));
        assertEquals(0, detail.get("photos").get(0).get("position").asInt());
        assertEquals(1, detail.get("photos").get(1).get("position").asInt());
        verify(trailCatalogClient, never()).trailExists(any());
    }

    // ---------------------------------------------------------------- AC-09

    @Test
    void updateReplacesEditableFieldsKeepsTrailAndAdvancesUpdatedAt() throws Exception {
        UUID id = createMemory("user-a",
                memoryJson(TRAIL, today().minusDays(5), "Before", "Old story", "PRIVATE"));
        OffsetDateTime before = updatedAt(id);
        clearInvocations(trailCatalogClient);

        String body = """
                {"trailId":"%s","tripDate":"%s","title":"  After  ","story":"   ","visibility":"PUBLIC"}"""
                .formatted(OTHER_TRAIL, today().minusDays(4));

        mockMvc.perform(put("/api/memories/{id}", id)
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trailId").value(TRAIL.toString()))
                .andExpect(jsonPath("$.tripDate").value(today().minusDays(4).toString()))
                .andExpect(jsonPath("$.title").value("After"))
                .andExpect(jsonPath("$.story").isEmpty())
                .andExpect(jsonPath("$.visibility").value("PUBLIC"));

        Map<String, Object> row = jdbc.queryForMap("SELECT * FROM memories WHERE id = ?", id);
        assertEquals(TRAIL, row.get("trail_id"));
        assertEquals("After", row.get("title"));
        assertNull(row.get("story"));
        assertEquals("PUBLIC", row.get("visibility"));
        assertTrue(updatedAt(id).isAfter(before));
        verify(trailCatalogClient, never()).trailExists(any());
    }

    @Test
    void updateWithoutVisibilityIsRejectedAndChangesNothing() throws Exception {
        UUID id = createMemory("user-a", TRAIL, today(), "Shared", "PUBLIC");

        expectFieldError(put("/api/memories/{id}", id),
                updateJson(today(), "Changed", null, null), "visibility");

        assertEquals("Shared", jdbc.queryForObject(
                "SELECT title FROM memories WHERE id = ?", String.class, id));
        assertEquals("PUBLIC", jdbc.queryForObject(
                "SELECT visibility FROM memories WHERE id = ?", String.class, id));
    }

    @Test
    void updateAppliesTheSameTripDateRule() throws Exception {
        UUID id = createMemory("user-a", TRAIL, today(), "Dated", "PRIVATE");

        expectFieldError(put("/api/memories/{id}", id),
                updateJson(today().plusDays(2), "Dated", null, "PRIVATE"), "tripDate");
    }

    // ---------------------------------------------------------------- AC-10

    @Test
    void softDeleteHidesTheMemoryFromEveryEndpoint() throws Exception {
        UUID id = createMemory("user-a", TRAIL, today(), "To delete", "PUBLIC");
        UUID photo = addPhoto(id);
        OffsetDateTime before = updatedAt(id);

        mockMvc.perform(delete("/api/memories/{id}", id).with(userA()))
                .andExpect(status().isNoContent());

        Map<String, Object> row = jdbc.queryForMap("SELECT * FROM memories WHERE id = ?", id);
        assertEquals(true, row.get("deleted"));
        assertTrue(updatedAt(id).isAfter(before));
        // Photo rows and stored objects are retained (section 18.3).
        assertEquals(1, jdbc.queryForObject(
                "SELECT count(*) FROM memory_photos WHERE memory_id = ?", Integer.class, id));
        assertEquals(1, storage.objects().size());

        expectMemoryNotFound(mockMvc.perform(get("/api/memories/{id}", id).with(userA())).andReturn());
        expectMemoryNotFound(mockMvc.perform(put("/api/memories/{id}", id)
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson(today(), "Revived", null, "PUBLIC")))
                .andReturn());
        expectMemoryNotFound(mockMvc.perform(delete("/api/memories/{id}", id).with(userA())).andReturn());
        expectMemoryNotFound(uploadPhoto("user-a", id,
                com.jay.outdoor.memory.support.Fixtures.jpeg(4, 4)).andReturn());
        expectMemoryNotFound(mockMvc.perform(put("/api/memories/{id}/photos/order", id)
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"photoIds\":[\"" + photo + "\"]}"))
                .andReturn());
        expectMemoryNotFound(mockMvc.perform(delete("/api/memories/{id}/photos/{photoId}", id, photo)
                .with(userA())).andReturn());

        mockMvc.perform(get("/api/memories").with(userA()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(get("/api/memories/public").param("trailId", TRAIL.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.totalItems").value(0));
        expectMemoryNotFound(mockMvc.perform(get("/api/memories/public/{id}", id)).andReturn());

        assertEquals(1, storage.objects().size());
        assertTrue(storage.deletes().isEmpty());
    }

    // ---------------------------------------------------------------- AC-30

    @Test
    void malformedRequestsAreValidationProblemsNeverServerErrors() throws Exception {
        mockMvc.perform(post("/api/memories")
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"trailId\": \"" + TRAIL + "\", \"title\": "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/memories")
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(memoryJson(TRAIL, today(), "Friends only", null, "FRIENDS")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/memories")
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"trailId\":\"not-a-uuid\",\"tripDate\":\"" + today()
                                + "\",\"title\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(get("/api/memories/{id}", "not-a-uuid").with(userA()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        UUID id = createMemory("user-a", TRAIL, today(), "Photo target", null);

        mockMvc.perform(multipart("/api/memories/{id}/photos", id)
                        .file(new MockMultipartFile("photo", "a.jpg", "image/jpeg",
                                com.jay.outdoor.memory.support.Fixtures.jpeg(4, 4)))
                        .with(userA()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/memories/{id}/photos", id)
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(delete("/api/memories/{id}/photos/{photoId}", id, "nope").with(userA()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(put("/api/memories/{id}/photos/order", id)
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("photoIds"));
    }

    // ---------------------------------------------------------------- helpers

    private void expectFieldError(
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
            String body,
            String field
    ) throws Exception {
        mockMvc.perform(request
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.title").value("Validation Failed"))
                .andExpect(jsonPath("$.errors[0].field").value(field));
    }

    private static void expectMemoryNotFound(MvcResult result) throws Exception {
        assertEquals(404, result.getResponse().getStatus());
        assertEquals("MEMORY_NOT_FOUND", json(result).get("code").asString());
    }

    private void insertMemory(
            UUID id,
            String owner,
            LocalDate tripDate,
            OffsetDateTime createdAt,
            String visibility
    ) {
        jdbc.update("""
                        INSERT INTO memories (id, owner_subject, trail_id, trip_date, title,
                                              visibility, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                id, owner, TRAIL, tripDate, "Seeded " + id, visibility, createdAt, createdAt);
    }

    private int count() {
        return jdbc.queryForObject("SELECT count(*) FROM memories", Integer.class);
    }

    private String story(UUID id) {
        return jdbc.queryForObject("SELECT story FROM memories WHERE id = ?", String.class, id);
    }

    private OffsetDateTime updatedAt(UUID id) {
        return jdbc.queryForObject(
                "SELECT updated_at FROM memories WHERE id = ?", OffsetDateTime.class, id);
    }

    private static List<UUID> ids(JsonNode array) {
        assertFalse(array == null || !array.isArray());
        return array.valueStream().map(node -> UUID.fromString(node.get("id").asString())).toList();
    }
}
