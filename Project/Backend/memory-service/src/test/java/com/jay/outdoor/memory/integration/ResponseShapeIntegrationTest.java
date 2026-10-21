package com.jay.outdoor.memory.integration;

import com.jay.outdoor.memory.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Exact JSON field sets of every owner and public response (AC-19, D4). */
class ResponseShapeIntegrationTest extends AbstractIntegrationTest {

    private static final Set<String> PHOTO = Set.of("id", "position", "url", "urlExpiresAt");
    private static final Set<String> PAGE = Set.of("items", "page", "size", "totalItems", "totalPages");
    private static final Set<String> OWNER_SUMMARY = Set.of("id", "trailId", "tripDate", "title",
            "visibility", "photoCount", "coverPhoto", "createdAt", "updatedAt");
    private static final Set<String> OWNER_DETAIL = Set.of("id", "trailId", "tripDate", "title",
            "story", "visibility", "photos", "createdAt", "updatedAt");
    private static final Set<String> PUBLIC_SUMMARY = Set.of("id", "trailId", "tripDate", "title",
            "storyExcerpt", "storyTruncated", "photoCount", "coverPhoto", "createdAt");
    private static final Set<String> PUBLIC_DETAIL = Set.of("id", "trailId", "tripDate", "title",
            "story", "photos", "createdAt");

    private static final List<String> FORBIDDEN = List.of("ownerSubject", "owner_subject", "user-a",
            "deleted", "objectKey", "object_key", "mediaType", "media_type", "email", "userId",
            "displayName", "image/jpeg", "memories/");

    @Test
    void ownerResponsesHaveExactlyTheSpecifiedFields() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/memories")
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(memoryJson(TRAIL, today(), "Shape", "Story", "PUBLIC")))
                .andExpect(status().isCreated())
                .andReturn();
        assertEquals(OWNER_DETAIL, fieldNames(json(created)));
        assertClean(created);
        UUID id = UUID.fromString(json(created).get("id").asString());

        MvcResult uploaded = uploadPhoto("user-a", id,
                com.jay.outdoor.memory.support.Fixtures.jpeg(6, 6))
                .andExpect(status().isCreated())
                .andReturn();
        assertEquals(PHOTO, fieldNames(json(uploaded)));
        assertClean(uploaded);
        UUID photo = UUID.fromString(json(uploaded).get("id").asString());

        MvcResult detail = mockMvc.perform(get("/api/memories/{id}", id).with(userA()))
                .andExpect(status().isOk()).andReturn();
        assertEquals(OWNER_DETAIL, fieldNames(json(detail)));
        assertEquals(PHOTO, fieldNames(json(detail).get("photos").get(0)));
        assertClean(detail);

        MvcResult updated = mockMvc.perform(put("/api/memories/{id}", id)
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson(today(), "Shape", "Story", "PUBLIC")))
                .andExpect(status().isOk()).andReturn();
        assertEquals(OWNER_DETAIL, fieldNames(json(updated)));
        assertClean(updated);

        MvcResult list = mockMvc.perform(get("/api/memories").with(userA()))
                .andExpect(status().isOk()).andReturn();
        JsonNode page = json(list);
        assertEquals(PAGE, fieldNames(page));
        assertEquals(OWNER_SUMMARY, fieldNames(page.get("items").get(0)));
        assertEquals(PHOTO, fieldNames(page.get("items").get(0).get("coverPhoto")));
        assertClean(list);

        MvcResult reordered = mockMvc.perform(put("/api/memories/{id}/photos/order", id)
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"photoIds\":[\"" + photo + "\"]}"))
                .andExpect(status().isOk()).andReturn();
        assertEquals(PHOTO, fieldNames(json(reordered).get(0)));
        assertClean(reordered);
    }

    @Test
    void publicResponsesHaveExactlyTheSpecifiedFields() throws Exception {
        UUID id = createMemory("user-a", memoryJson(TRAIL, today(), "Public shape", "Story", "PUBLIC"));
        addPhoto(id);
        UUID bare = createMemory("user-a", memoryJson(TRAIL, today().minusDays(1), "Bare", null, "PUBLIC"));

        MvcResult list = mockMvc.perform(get("/api/memories/public").param("trailId", TRAIL.toString()))
                .andExpect(status().isOk()).andReturn();
        JsonNode page = json(list);
        assertEquals(PAGE, fieldNames(page));
        assertEquals(PUBLIC_SUMMARY, fieldNames(page.get("items").get(0)));
        assertEquals(PHOTO, fieldNames(page.get("items").get(0).get("coverPhoto")));
        assertEquals(PUBLIC_SUMMARY, fieldNames(page.get("items").get(1)));
        assertClean(list);

        MvcResult detail = mockMvc.perform(get("/api/memories/public/{id}", id))
                .andExpect(status().isOk()).andReturn();
        assertEquals(PUBLIC_DETAIL, fieldNames(json(detail)));
        assertEquals(PHOTO, fieldNames(json(detail).get("photos").get(0)));
        assertClean(detail);

        MvcResult bareDetail = mockMvc.perform(get("/api/memories/public/{id}", bare))
                .andExpect(status().isOk()).andReturn();
        assertEquals(PUBLIC_DETAIL, fieldNames(json(bareDetail)));
        assertClean(bareDetail);
    }

    private void assertClean(MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString();
        for (String forbidden : FORBIDDEN) {
            assertFalse(body.contains(forbidden), "response contains " + forbidden + ": " + body);
        }
        for (String key : storage.objects().keySet()) {
            assertFalse(body.contains(key), "response contains an object key");
        }
    }
}
