package com.jay.outdoor.memory.integration;

import com.jay.outdoor.memory.exception.TrailServiceUnavailableException;
import com.jay.outdoor.memory.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Public trail list and detail, all without a token (AC-14, AC-15, AC-16, AC-28, AC-29). */
class PublicMemoryApiIntegrationTest extends AbstractIntegrationTest {

    // ---------------------------------------------------------------- AC-14

    @Test
    void publicListReturnsOnlyPublicActiveMemoriesOfTheTrailInOrder() throws Exception {
        Matrix m = matrix();

        JsonNode page = json(mockMvc.perform(get("/api/memories/public")
                        .param("trailId", TRAIL.toString()))
                .andExpect(status().isOk())
                .andReturn());

        assertEquals(List.of(m.publicNewest, m.publicActive, m.publicOldest), ids(page.get("items")));
        assertEquals(3, page.get("totalItems").asInt());
        assertEquals(1, page.get("totalPages").asInt());
        assertEquals(0, page.get("page").asInt());
        assertEquals(20, page.get("size").asInt());

        JsonNode paged = json(mockMvc.perform(get("/api/memories/public")
                        .param("trailId", TRAIL.toString())
                        .param("page", "1")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andReturn());
        assertEquals(List.of(m.publicOldest), ids(paged.get("items")));
        assertEquals(3, paged.get("totalItems").asInt());
        assertEquals(2, paged.get("totalPages").asInt());
    }

    @Test
    void publicListBreaksTiesByCreatedAtThenIdDescending() throws Exception {
        LocalDate date = LocalDate.of(2025, 6, 1);
        OffsetDateTime earlier = OffsetDateTime.parse("2025-06-02T10:00:00Z");
        OffsetDateTime later = OffsetDateTime.parse("2025-06-02T11:00:00Z");
        UUID lowId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID highId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        UUID laterId = UUID.fromString("00000000-0000-0000-0000-000000000000");

        for (Object[] row : List.of(
                new Object[]{lowId, earlier}, new Object[]{highId, earlier}, new Object[]{laterId, later})) {
            jdbc.update("""
                            INSERT INTO memories (id, owner_subject, trail_id, trip_date, title,
                                                  visibility, created_at, updated_at)
                            VALUES (?, 'user-a', ?, ?, 'Seeded', 'PUBLIC', ?, ?)""",
                    row[0], TRAIL, date, row[1], row[1]);
        }

        JsonNode page = json(mockMvc.perform(get("/api/memories/public")
                        .param("trailId", TRAIL.toString()))
                .andExpect(status().isOk())
                .andReturn());

        assertEquals(List.of(laterId, highId, lowId), ids(page.get("items")));
    }

    @Test
    void publicListRequiresAValidTrailIdAndPaging() throws Exception {
        for (String query : List.of("", "trailId=not-a-uuid", "trailId=" + TRAIL + "&size=51",
                "trailId=" + TRAIL + "&page=-1", "trailId=" + TRAIL + "&size=0")) {
            mockMvc.perform(get("/api/memories/public?" + query))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }
    }

    // ---------------------------------------------------------------- AC-15

    @Test
    void publicDetailIsVisibleOnlyForPublicActiveMemories() throws Exception {
        Matrix m = matrix();

        mockMvc.perform(get("/api/memories/public/{id}", m.publicActive))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(m.publicActive.toString()))
                .andExpect(jsonPath("$.story").value("Shared story"));

        MvcResult random = mockMvc.perform(get("/api/memories/public/{id}", UUID.randomUUID()))
                .andReturn();
        assertEquals(404, random.getResponse().getStatus());
        assertEquals("MEMORY_NOT_FOUND", json(random).get("code").asString());

        for (UUID hidden : List.of(m.privateActive, m.publicDeleted, m.privateDeleted)) {
            MvcResult result = mockMvc.perform(get("/api/memories/public/{id}", hidden)).andReturn();
            assertEquals(404, result.getResponse().getStatus());
            assertEquals(withoutInstance(random), withoutInstance(result));
        }
    }

    // ---------------------------------------------------------------- AC-16

    @Test
    void visibilityChangesTakeEffectOnTheNextRequest() throws Exception {
        UUID id = createMemory("user-a", TRAIL, today(), "Becoming public", "PRIVATE");

        assertPublic(id, false);

        setVisibility("user-a", id, "PUBLIC").andExpect(status().isOk());
        assertPublic(id, true);

        setVisibility("user-a", id, "PRIVATE").andExpect(status().isOk());
        assertPublic(id, false);
    }

    // ---------------------------------------------------------------- AC-28

    @Test
    void aDeletedTrailHidesItsMemoriesPubliclyButNotFromTheOwner() throws Exception {
        UUID id = createMemory("user-a", TRAIL, today(), "Trail later removed", "PUBLIC");
        when(trailCatalogClient.trailExists(TRAIL)).thenReturn(false);

        mockMvc.perform(get("/api/memories/public").param("trailId", TRAIL.toString()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRAIL_NOT_FOUND"));

        mockMvc.perform(get("/api/memories/public/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MEMORY_NOT_FOUND"));

        mockMvc.perform(get("/api/memories/{id}", id).with(userA()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trailId").value(TRAIL.toString()));
        mockMvc.perform(get("/api/memories").with(userA()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1));

        when(trailCatalogClient.trailExists(TRAIL)).thenReturn(true);
        mockMvc.perform(get("/api/memories/public/{id}", id)).andExpect(status().isOk());
    }

    @Test
    void eachPublicRequestMakesExactlyOneTrailCallRegardlessOfPageSize() throws Exception {
        for (int i = 0; i < 4; i++) {
            UUID id = createMemory("user-a", TRAIL, today().minusDays(i), "Public " + i, "PUBLIC");
            addPhoto(id);
        }

        for (String size : List.of("1", "2", "50")) {
            clearInvocations(trailCatalogClient);
            mockMvc.perform(get("/api/memories/public")
                            .param("trailId", TRAIL.toString())
                            .param("size", size))
                    .andExpect(status().isOk());
            verify(trailCatalogClient, times(1)).trailExists(any());
            verify(trailCatalogClient, times(1)).trailExists(TRAIL);
        }

        UUID one = createMemory("user-a", TRAIL, today(), "Detail", "PUBLIC");
        clearInvocations(trailCatalogClient);
        mockMvc.perform(get("/api/memories/public/{id}", one)).andExpect(status().isOk());
        verify(trailCatalogClient, times(1)).trailExists(TRAIL);
    }

    @Test
    void publicReadsFailClosedWhenTrailServiceCannotAnswer() throws Exception {
        UUID id = createMemory("user-a", TRAIL, today(), "Outage", "PUBLIC");
        when(trailCatalogClient.trailExists(TRAIL)).thenThrow(new TrailServiceUnavailableException());

        mockMvc.perform(get("/api/memories/public").param("trailId", TRAIL.toString()))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("TRAIL_SERVICE_UNAVAILABLE"));
        mockMvc.perform(get("/api/memories/public/{id}", id))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("TRAIL_SERVICE_UNAVAILABLE"));
    }

    // ---------------------------------------------------------------- AC-29

    @Test
    void storyExcerptFollowsTheTruncationRules() throws Exception {
        String exact = "a".repeat(240);
        String withSpaces = ("word ".repeat(60)).trim() + " tail end";          // > 240
        String noSpaces = "b".repeat(300);

        UUID nullStory = createMemory("user-a",
                memoryJson(TRAIL, today().minusDays(1), "Null story", null, "PUBLIC"));
        UUID exactStory = createMemory("user-a",
                memoryJson(TRAIL, today().minusDays(2), "Exact", exact, "PUBLIC"));
        UUID spaced = createMemory("user-a",
                memoryJson(TRAIL, today().minusDays(3), "Spaced", withSpaces, "PUBLIC"));
        UUID solid = createMemory("user-a",
                memoryJson(TRAIL, today().minusDays(4), "Solid", noSpaces, "PUBLIC"));

        JsonNode items = json(mockMvc.perform(get("/api/memories/public")
                        .param("trailId", TRAIL.toString()))
                .andExpect(status().isOk())
                .andReturn()).get("items");

        assertEquals(List.of(nullStory, exactStory, spaced, solid), ids(items));

        assertTrue(items.get(0).get("storyExcerpt").isNull());
        assertFalse(items.get(0).get("storyTruncated").asBoolean());

        assertEquals(exact, items.get(1).get("storyExcerpt").asString());
        assertFalse(items.get(1).get("storyTruncated").asBoolean());

        String expectedSpaced = withSpaces.substring(0, withSpaces.lastIndexOf(' ', 239)).stripTrailing();
        assertEquals(expectedSpaced, items.get(2).get("storyExcerpt").asString());
        assertTrue(items.get(2).get("storyTruncated").asBoolean());
        assertTrue(expectedSpaced.length() <= 240 && expectedSpaced.endsWith("word"));

        assertEquals("b".repeat(240), items.get(3).get("storyExcerpt").asString());
        assertTrue(items.get(3).get("storyTruncated").asBoolean());

        mockMvc.perform(get("/api/memories/public/{id}", spaced))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.story").value(withSpaces));
    }

    // ---------------------------------------------------------------- helpers

    private record Matrix(
            UUID publicActive,
            UUID publicNewest,
            UUID publicOldest,
            UUID privateActive,
            UUID publicDeleted,
            UUID privateDeleted
    ) {
    }

    private Matrix matrix() throws Exception {
        UUID publicActive = createMemory("user-a",
                memoryJson(TRAIL, today().minusDays(5), "Public active", "Shared story", "PUBLIC"));
        UUID publicNewest = createMemory("user-b", TRAIL, today(), "Public newest", "PUBLIC");
        UUID publicOldest = createMemory("user-a", TRAIL, today().minusDays(30), "Public oldest", "PUBLIC");
        UUID privateActive = createMemory("user-a", TRAIL, today().minusDays(1), "Private active", "PRIVATE");
        UUID publicDeleted = createMemory("user-a", TRAIL, today().minusDays(2), "Public deleted", "PUBLIC");
        UUID privateDeleted = createMemory("user-a", TRAIL, today().minusDays(3), "Private deleted", "PRIVATE");
        createMemory("user-a", OTHER_TRAIL, today(), "Other trail", "PUBLIC");

        for (UUID deleted : List.of(publicDeleted, privateDeleted)) {
            mockMvc.perform(delete("/api/memories/{id}", deleted).with(userA()))
                    .andExpect(status().isNoContent());
        }

        return new Matrix(publicActive, publicNewest, publicOldest,
                privateActive, publicDeleted, privateDeleted);
    }

    private void assertPublic(UUID id, boolean visible) throws Exception {
        mockMvc.perform(get("/api/memories/public").param("trailId", TRAIL.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(visible ? 1 : 0)))
                .andExpect(jsonPath("$.totalItems").value(visible ? 1 : 0));
        mockMvc.perform(get("/api/memories/public/{id}", id))
                .andExpect(visible ? status().isOk() : status().isNotFound());
    }

    private static List<UUID> ids(JsonNode array) {
        return array.valueStream().map(node -> UUID.fromString(node.get("id").asString())).toList();
    }
}
