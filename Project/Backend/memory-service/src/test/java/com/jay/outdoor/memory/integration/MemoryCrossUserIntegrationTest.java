package com.jay.outdoor.memory.integration;

import com.jay.outdoor.memory.support.AbstractIntegrationTest;
import com.jay.outdoor.memory.support.Fixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/** User B against User A's Memory: indistinguishable from a nonexistent id (AC-11, AC-12). */
class MemoryCrossUserIntegrationTest extends AbstractIntegrationTest {

    private UUID memoryA;
    private UUID photo1;
    private UUID photo2;
    private Map<String, Object> rowBefore;
    private List<Map<String, Object>> photosBefore;

    @BeforeEach
    void createUserAMemoryWithPhotos() throws Exception {
        memoryA = createMemory("user-a",
                memoryJson(TRAIL, today(), "A's private walk", "Private story", "PRIVATE"));
        photo1 = addPhoto(memoryA);
        photo2 = addPhoto(memoryA);
        storage.puts().clear();
        rowBefore = jdbc.queryForMap("SELECT * FROM memories WHERE id = ?", memoryA);
        photosBefore = photoRows();
    }

    // ---------------------------------------------------------------- AC-11

    @Test
    void userBCannotReadUpdateOrDeleteUserAsMemory() throws Exception {
        UUID random = UUID.randomUUID();

        assertSameNotFound(
                mockMvc.perform(get("/api/memories/{id}", memoryA).with(userB())).andReturn(),
                mockMvc.perform(get("/api/memories/{id}", random).with(userB())).andReturn());

        String update = updateJson(today(), "Hijacked", "B was here", "PUBLIC");
        assertSameNotFound(
                mockMvc.perform(put("/api/memories/{id}", memoryA).with(userB())
                        .contentType(MediaType.APPLICATION_JSON).content(update)).andReturn(),
                mockMvc.perform(put("/api/memories/{id}", random).with(userB())
                        .contentType(MediaType.APPLICATION_JSON).content(update)).andReturn());

        assertSameNotFound(
                mockMvc.perform(delete("/api/memories/{id}", memoryA).with(userB())).andReturn(),
                mockMvc.perform(delete("/api/memories/{id}", random).with(userB())).andReturn());

        assertEquals(rowBefore, jdbc.queryForMap("SELECT * FROM memories WHERE id = ?", memoryA));
    }

    @Test
    void userBsListDoesNotContainUserAsMemory() throws Exception {
        JsonNode page = json(mockMvc.perform(get("/api/memories").with(userB())).andReturn());
        assertEquals(0, page.get("totalItems").asInt());
    }

    // ---------------------------------------------------------------- AC-12

    @Test
    void userBCannotAddReorderOrRemoveUserAsPhotos() throws Exception {
        UUID random = UUID.randomUUID();
        byte[] image = Fixtures.jpeg(10, 10);

        assertSameNotFound(
                uploadPhoto("user-b", memoryA, image).andReturn(),
                uploadPhoto("user-b", random, image).andReturn());

        String reversed = "{\"photoIds\":[\"" + photo2 + "\",\"" + photo1 + "\"]}";
        assertSameNotFound(
                mockMvc.perform(put("/api/memories/{id}/photos/order", memoryA).with(userB())
                        .contentType(MediaType.APPLICATION_JSON).content(reversed)).andReturn(),
                mockMvc.perform(put("/api/memories/{id}/photos/order", random).with(userB())
                        .contentType(MediaType.APPLICATION_JSON).content(reversed)).andReturn());

        assertSameNotFound(
                mockMvc.perform(delete("/api/memories/{id}/photos/{photoId}", memoryA, photo1)
                        .with(userB())).andReturn(),
                mockMvc.perform(delete("/api/memories/{id}/photos/{photoId}", random, photo1)
                        .with(userB())).andReturn());

        assertTrue(storage.puts().isEmpty(), "nothing written to storage");
        assertTrue(storage.deletes().isEmpty(), "nothing deleted from storage");
        assertEquals(2, storage.objects().size());
        assertEquals(photosBefore, photoRows());
        assertEquals(rowBefore, jdbc.queryForMap("SELECT * FROM memories WHERE id = ?", memoryA));
    }

    @Test
    void aPhotoIdOfAnotherMemoryIsNotFoundEvenForItsOwnersOtherMemory() throws Exception {
        UUID otherOfA = createMemory("user-a", TRAIL, today(), "Second", "PRIVATE");

        MvcResult result = mockMvc.perform(
                        delete("/api/memories/{id}/photos/{photoId}", otherOfA, photo1).with(userA()))
                .andReturn();

        assertEquals(404, result.getResponse().getStatus());
        assertEquals("PHOTO_NOT_FOUND", json(result).get("code").asString());
        assertEquals(photosBefore, photoRows());
    }

    private List<Map<String, Object>> photoRows() {
        return jdbc.queryForList(
                "SELECT * FROM memory_photos WHERE memory_id = ? ORDER BY position", memoryA);
    }

    private static void assertSameNotFound(MvcResult foreign, MvcResult nonexistent) throws Exception {
        assertEquals(404, foreign.getResponse().getStatus());
        assertEquals(404, nonexistent.getResponse().getStatus());
        assertEquals("MEMORY_NOT_FOUND", json(foreign).get("code").asString());
        assertEquals(withoutInstance(nonexistent), withoutInstance(foreign));
    }
}
