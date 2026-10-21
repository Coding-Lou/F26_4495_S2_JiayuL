package com.jay.outdoor.memory.integration;

import com.jay.outdoor.memory.support.AbstractIntegrationTest;
import com.jay.outdoor.memory.support.Fixtures;
import com.jay.outdoor.memory.support.InMemoryMemoryPhotoStorage.StoredObject;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Photo upload, sanitization, limits, storage failures, cover, reorder, and removal. */
class MemoryPhotoIntegrationTest extends AbstractIntegrationTest {

    // ---------------------------------------------------------------- AC-17, AC-21

    @Test
    void acceptedTypesAreStoredReencodedUnderAServerBuiltKey() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Types", "PRIVATE");

        assertStoredAs(memory, Fixtures.JPEG_GPS, 64, 48, "image/jpeg", "jpg");
        assertStoredAs(memory, Fixtures.PNG_TEXT_EXIF, 40, 30, "image/png", "png");
        assertStoredAs(memory, Fixtures.WEBP_EXIF, 48, 32, "image/jpeg", "jpg");
        assertStoredAs(memory, Fixtures.WEBP_ALPHA_EXIF, 48, 32, "image/png", "png");

        assertEquals(4, storage.objects().size());
    }

    private void assertStoredAs(
            UUID memory,
            String fixture,
            int width,
            int height,
            String mediaType,
            String extension
    ) throws Exception {
        byte[] upload = Fixtures.read(fixture);
        int before = storage.puts().size();

        // A misleading declared type and filename are ignored.
        MvcResult result = mockMvc.perform(multipart("/api/memories/{id}/photos", memory)
                        .file(new MockMultipartFile("file", "holiday.gif", "image/gif", upload))
                        .with(userA()))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode photo = json(result);
        UUID photoId = UUID.fromString(photo.get("id").asString());
        String expectedKey = "memories/" + memory + "/" + photoId + "." + extension;

        assertEquals(before + 1, storage.puts().size());
        assertEquals(expectedKey, storage.puts().getLast());
        StoredObject stored = storage.objects().get(expectedKey);
        assertNotNull(stored);
        assertEquals(mediaType, stored.mediaType());

        // The original bytes never reach storage; the stored bytes carry no metadata.
        assertFalse(java.util.Arrays.equals(upload, stored.content()));
        assertFalse(Fixtures.containsAscii(stored.content(), Fixtures.GPS_MARKER));
        assertFalse(Fixtures.containsAscii(stored.content(), "Exif"));
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(stored.content()));
        assertNotNull(decoded);
        assertEquals(width, decoded.getWidth());
        assertEquals(height, decoded.getHeight());

        Map<String, Object> row = jdbc.queryForMap("SELECT * FROM memory_photos WHERE id = ?", photoId);
        assertEquals(expectedKey, row.get("object_key"));
        assertEquals(mediaType, row.get("media_type"));
    }

    // ---------------------------------------------------------------- AC-18

    @Test
    void unsupportedTypesAreRefusedAndNothingIsStored() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Refusals", "PRIVATE");

        for (String fixture : List.of(Fixtures.GIF, Fixtures.SVG, Fixtures.HEIC,
                Fixtures.WEBP_ANIMATED, Fixtures.TEXT_AS_JPG)) {
            uploadPhoto("user-a", memory, Fixtures.read(fixture))
                    .andExpect(status().isUnsupportedMediaType())
                    .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));
        }

        assertTrue(storage.puts().isEmpty());
        assertEquals(0, photoCount(memory));
    }

    @Test
    void oversizeFilesAndImagesAreRefusedAndNothingIsStored() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Too big", "PRIVATE");

        uploadPhoto("user-a", memory, new byte[10 * 1024 * 1024 + 1])
                .andExpect(status().isContentTooLarge())
                .andExpect(jsonPath("$.code").value("PAYLOAD_TOO_LARGE"));

        uploadPhoto("user-a", memory, Fixtures.binaryPng(12_001, 1))
                .andExpect(status().isContentTooLarge())
                .andExpect(jsonPath("$.code").value("IMAGE_TOO_LARGE"));

        uploadPhoto("user-a", memory, Fixtures.binaryPng(6_400, 6_400))
                .andExpect(status().isContentTooLarge())
                .andExpect(jsonPath("$.code").value("IMAGE_TOO_LARGE"));

        assertTrue(storage.puts().isEmpty());
        assertEquals(0, photoCount(memory));
    }

    @Test
    void aSixthPhotoIsAConflict() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Five max", "PRIVATE");
        for (int i = 0; i < 5; i++) {
            addPhoto(memory);
        }
        int puts = storage.puts().size();

        uploadPhoto("user-a", memory, Fixtures.jpeg(5, 5))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PHOTO_LIMIT_REACHED"));

        assertEquals(puts, storage.puts().size(), "the pre-check refuses before storage");
        assertEquals(5, photoCount(memory));
        assertEquals(5, storage.objects().size());
    }

    @Test
    void concurrentUploadsToAMemoryWithFourPhotosEndWithExactlyFive() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Race", "PRIVATE");
        for (int i = 0; i < 4; i++) {
            addPhoto(memory);
        }

        // Both requests pass the read-only pre-check; the row lock decides.
        CountDownLatch bothStored = new CountDownLatch(2);
        storage.afterPut(key -> {
            bothStored.countDown();
            try {
                bothStored.await(5, java.util.concurrent.TimeUnit.SECONDS);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
        });

        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Callable<Integer> upload = () -> uploadPhoto("user-a", memory, Fixtures.jpeg(7, 7))
                    .andReturn().getResponse().getStatus();
            List<Future<Integer>> results = new ArrayList<>();
            results.add(executor.submit(upload));
            results.add(executor.submit(upload));

            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> result : results) {
                statuses.add(result.get());
            }
            statuses.sort(Integer::compareTo);
            assertEquals(List.of(201, 409), statuses);
        } finally {
            executor.shutdownNow();
        }

        assertEquals(5, photoCount(memory));
        assertEquals(5, storage.objects().size(), "the refused upload's object was compensated");
        assertEquals(6, storage.puts().size());
        assertEquals(1, storage.deletes().size());
    }

    // ---------------------------------------------------------------- AC-20 (signed URL in responses)

    @Test
    void photoResponsesCarryAFifteenMinuteSignedUrlAndTheDatabaseHoldsNoUrl() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "URLs", "PUBLIC");
        Instant before = Instant.now();

        JsonNode photo = json(uploadPhoto("user-a", memory, Fixtures.jpeg(9, 9))
                .andExpect(status().isCreated()).andReturn());

        assertTrue(photo.get("url").asString().startsWith("https://photos.example.test/signed/"));
        Instant expiresAt = Instant.parse(photo.get("urlExpiresAt").asString());
        assertTrue(!expiresAt.isBefore(before.plus(Duration.ofMinutes(15)).minusSeconds(1)));
        assertTrue(!expiresAt.isAfter(Instant.now().plus(Duration.ofMinutes(15)).plusSeconds(1)));

        JsonNode publicPhoto = json(mockMvc.perform(get("/api/memories/public/{id}", memory))
                .andExpect(status().isOk()).andReturn()).get("photos").get(0);
        assertTrue(publicPhoto.get("url").asString().startsWith("https://photos.example.test/signed/"));

        for (Map<String, Object> row : jdbc.queryForList("SELECT * FROM memory_photos")) {
            for (Object value : row.values()) {
                String text = String.valueOf(value);
                assertFalse(text.contains("http") || text.contains("signature") || text.contains("?"),
                        "stored value looks like a URL: " + text);
            }
        }
    }

    // ---------------------------------------------------------------- AC-22

    @Test
    void aStoragePutFailureIsServiceUnavailableAndWritesNoRow() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Storage down", "PRIVATE");
        storage.failPuts(true);

        uploadPhoto("user-a", memory, Fixtures.jpeg(5, 5))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("STORAGE_UNAVAILABLE"));

        assertEquals(0, photoCount(memory));
        assertTrue(storage.objects().isEmpty());
    }

    @Test
    void aDatabaseFailureAfterAPutDeletesTheObject() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Deleted mid-upload", "PRIVATE");
        // The Memory is deleted between the storage put and the locked re-check.
        storage.afterPut(key -> jdbc.update("UPDATE memories SET deleted = TRUE WHERE id = ?", memory));

        uploadPhoto("user-a", memory, Fixtures.jpeg(5, 5))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MEMORY_NOT_FOUND"));

        assertEquals(1, storage.puts().size());
        assertEquals(storage.puts(), storage.deletes());
        assertTrue(storage.objects().isEmpty());
        assertEquals(0, photoCount(memory));
    }

    @Test
    void aLimitReachedAfterThePutDeletesTheObject() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Filled mid-upload", "PRIVATE");
        for (int i = 0; i < 4; i++) {
            addPhoto(memory);
        }
        storage.puts().clear();
        storage.afterPut(key -> jdbc.update("""
                        INSERT INTO memory_photos (id, memory_id, object_key, media_type, position)
                        VALUES (?, ?, ?, 'image/jpeg', 99)""",
                UUID.randomUUID(), memory, "memories/" + memory + "/" + UUID.randomUUID() + ".jpg"));

        uploadPhoto("user-a", memory, Fixtures.jpeg(5, 5))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PHOTO_LIMIT_REACHED"));

        assertEquals(storage.puts(), storage.deletes());
        assertFalse(storage.objects().containsKey(storage.puts().getFirst()));
        assertEquals(5, photoCount(memory));
    }

    // ---------------------------------------------------------------- AC-24

    @Test
    void aMemoryWithoutPhotosIsValidEverywhere() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "No photos", "PUBLIC");

        mockMvc.perform(get("/api/memories/{id}", memory).with(userA()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photos", hasSize(0)));
        mockMvc.perform(get("/api/memories").with(userA()))
                .andExpect(jsonPath("$.items[0].photoCount").value(0))
                .andExpect(jsonPath("$.items[0].coverPhoto").isEmpty());
        mockMvc.perform(get("/api/memories/public").param("trailId", TRAIL.toString()))
                .andExpect(jsonPath("$.items[0].photoCount").value(0))
                .andExpect(jsonPath("$.items[0].coverPhoto").isEmpty());
        mockMvc.perform(get("/api/memories/public/{id}", memory))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.photos", hasSize(0)));

        String body = mockMvc.perform(get("/api/memories").with(userA()))
                .andReturn().getResponse().getContentAsString();
        assertTrue(body.contains("\"coverPhoto\":null"));
    }

    // ---------------------------------------------------------------- AC-25

    @Test
    void theCoverIsTheLowestPositionPhotoAndRemovingItPromotesTheNext() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Cover", "PUBLIC");
        UUID first = addPhoto(memory);
        UUID second = addPhoto(memory);
        addPhoto(memory);

        assertCover(memory, first, 3);

        mockMvc.perform(delete("/api/memories/{id}/photos/{photoId}", memory, first).with(userA()))
                .andExpect(status().isNoContent());

        assertCover(memory, second, 2);
    }

    private void assertCover(UUID memory, UUID expected, int count) throws Exception {
        mockMvc.perform(get("/api/memories").with(userA()))
                .andExpect(jsonPath("$.items[0].photoCount").value(count))
                .andExpect(jsonPath("$.items[0].coverPhoto.id").value(expected.toString()));
        mockMvc.perform(get("/api/memories/public").param("trailId", TRAIL.toString()))
                .andExpect(jsonPath("$.items[0].photoCount").value(count))
                .andExpect(jsonPath("$.items[0].coverPhoto.id").value(expected.toString()));
        mockMvc.perform(get("/api/memories/{id}", memory).with(userA()))
                .andExpect(jsonPath("$.photos[0].id").value(expected.toString()));
    }

    // ---------------------------------------------------------------- AC-26

    @Test
    void reorderWithAnExactPermutationRewritesPositionsAndMovesTheCover() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Reorder", "PRIVATE");
        UUID a = addPhoto(memory);
        UUID b = addPhoto(memory);
        UUID c = addPhoto(memory);
        mockMvc.perform(delete("/api/memories/{id}/photos/{photoId}", memory, b).with(userA()))
                .andExpect(status().isNoContent());
        UUID d = addPhoto(memory);                       // positions now a=0, c=2, d=3

        mockMvc.perform(put("/api/memories/{id}/photos/order", memory)
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(order(d, a, c)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].id").value(d.toString()))
                .andExpect(jsonPath("$[0].position").value(0))
                .andExpect(jsonPath("$[1].id").value(a.toString()))
                .andExpect(jsonPath("$[1].position").value(1))
                .andExpect(jsonPath("$[2].id").value(c.toString()))
                .andExpect(jsonPath("$[2].position").value(2));

        assertEquals(List.of(d, a, c), photoOrder(memory));
        mockMvc.perform(get("/api/memories").with(userA()))
                .andExpect(jsonPath("$.items[0].coverPhoto.id").value(d.toString()));
    }

    @Test
    void reorderRejectsAnythingButAnExactPermutation() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Strict", "PRIVATE");
        UUID a = addPhoto(memory);
        UUID b = addPhoto(memory);
        UUID other = createMemory("user-a", TRAIL, today(), "Other", "PRIVATE");
        UUID foreign = addPhoto(other);
        List<UUID> before = photoOrder(memory);

        for (String body : List.of(order(a), order(a, b, foreign), order(a, a), order(b, foreign),
                "{\"photoIds\":[\"" + a + "\",null]}", order(a, b, UUID.randomUUID()))) {
            mockMvc.perform(put("/api/memories/{id}/photos/order", memory)
                            .with(userA())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andExpect(jsonPath("$.errors[0].field").value("photoIds"));
        }

        assertEquals(before, photoOrder(memory));
        assertEquals(List.of(0, 1), jdbc.queryForList(
                "SELECT position FROM memory_photos WHERE memory_id = ? ORDER BY position",
                Integer.class, memory));
    }

    // ---------------------------------------------------------------- AC-27

    @Test
    void removingAPhotoDeletesTheRowThenTheObject() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Remove", "PRIVATE");
        UUID keep = addPhoto(memory);
        UUID remove = addPhoto(memory);
        String key = objectKey(remove);
        OffsetDateTime before = updatedAt(memory);

        mockMvc.perform(delete("/api/memories/{id}/photos/{photoId}", memory, remove).with(userA()))
                .andExpect(status().isNoContent());

        assertEquals(List.of(keep), photoOrder(memory));
        assertEquals(List.of(key), storage.deletes());
        assertFalse(storage.objects().containsKey(key));
        assertTrue(updatedAt(memory).isAfter(before));

        mockMvc.perform(delete("/api/memories/{id}/photos/{photoId}", memory, remove).with(userA()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PHOTO_NOT_FOUND"));
    }

    @Test
    @ExtendWith(OutputCaptureExtension.class)
    void aStorageDeleteFailureStillRemovesThePhotoAndLogsTheKey(CapturedOutput output) throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Orphan", "PRIVATE");
        UUID photo = addPhoto(memory);
        String key = objectKey(photo);
        storage.failDeletes(true);

        mockMvc.perform(delete("/api/memories/{id}/photos/{photoId}", memory, photo).with(userA()))
                .andExpect(status().isNoContent());

        assertEquals(0, photoCount(memory));
        assertTrue(storage.objects().containsKey(key));
        assertTrue(output.getOut().contains(key), "the orphaned key is logged");
    }

    // ---------------------------------------------------------------- AC-35

    @Test
    void addingReorderingAndRemovingPhotosAdvanceUpdatedAt() throws Exception {
        UUID memory = createMemory("user-a", TRAIL, today(), "Touch", "PRIVATE");

        OffsetDateTime t0 = updatedAt(memory);
        UUID a = addPhoto(memory);
        OffsetDateTime t1 = updatedAt(memory);
        assertTrue(t1.isAfter(t0), "add");

        UUID b = addPhoto(memory);
        OffsetDateTime t2 = updatedAt(memory);
        mockMvc.perform(put("/api/memories/{id}/photos/order", memory)
                        .with(userA())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(order(b, a)))
                .andExpect(status().isOk());
        OffsetDateTime t3 = updatedAt(memory);
        assertTrue(t3.isAfter(t2), "reorder");

        mockMvc.perform(delete("/api/memories/{id}/photos/{photoId}", memory, a).with(userA()))
                .andExpect(status().isNoContent());
        assertTrue(updatedAt(memory).isAfter(t3), "remove");

        String apiUpdatedAt = json(mockMvc.perform(get("/api/memories/{id}", memory).with(userA()))
                .andReturn()).get("updatedAt").asString();
        assertEquals(updatedAt(memory).toInstant(), OffsetDateTime.parse(apiUpdatedAt).toInstant());
    }

    // ---------------------------------------------------------------- helpers

    private static String order(UUID... ids) {
        StringBuilder json = new StringBuilder("{\"photoIds\":[");
        for (int i = 0; i < ids.length; i++) {
            json.append(i == 0 ? "" : ",").append('"').append(ids[i]).append('"');
        }
        return json.append("]}").toString();
    }

    private int photoCount(UUID memory) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM memory_photos WHERE memory_id = ?", Integer.class, memory);
    }

    private List<UUID> photoOrder(UUID memory) {
        return jdbc.queryForList(
                "SELECT id FROM memory_photos WHERE memory_id = ? ORDER BY position", UUID.class, memory);
    }

    private String objectKey(UUID photo) {
        return jdbc.queryForObject("SELECT object_key FROM memory_photos WHERE id = ?", String.class, photo);
    }

    private OffsetDateTime updatedAt(UUID memory) {
        return jdbc.queryForObject(
                "SELECT updated_at FROM memories WHERE id = ?", OffsetDateTime.class, memory);
    }
}
