package com.jay.outdoor.memory.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Local adapter: atomic writes, root guard, HMAC-signed expiring URLs (section 12, AC-20, AC-36). */
class LocalMemoryPhotoStorageTest {

    private static final Instant NOW = Instant.parse("2026-10-16T12:00:00Z");
    private static final Pattern URL = Pattern.compile(
            "^/api/memories/local-photos/([0-9a-f-]{36})/([0-9a-f-]{36}\\.(?:jpg|png))"
                    + "\\?expires=(\\d+)&signature=([A-Za-z0-9_-]+)$");

    @TempDir
    Path root;

    private final UUID memoryId = UUID.randomUUID();
    private final UUID photoId = UUID.randomUUID();
    private final String key = PhotoObjectKeys.photoKey(memoryId, photoId, "jpg");

    private LocalMemoryPhotoStorage storage(String secret, Instant now) {
        return new LocalMemoryPhotoStorage(root, secret, "", Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test
    void putWritesTheFileAtTheKeyLeavingNoTemporaryFile() throws Exception {
        LocalMemoryPhotoStorage storage = storage("secret", NOW);
        byte[] content = {1, 2, 3, 4};

        storage.put(key, content, "image/jpeg");

        Path file = root.resolve(key);
        assertArrayEquals(content, Files.readAllBytes(file));
        try (Stream<Path> files = Files.list(file.getParent())) {
            assertEquals(List.of(file), files.toList());
        }

        storage.delete(key);
        assertFalse(Files.exists(file));
        storage.delete(key);    // idempotent
    }

    @Test
    void keysOutsideTheRootAreRefused() {
        LocalMemoryPhotoStorage storage = storage("secret", NOW);

        assertThrows(IllegalArgumentException.class, () -> storage.resolve("../outside.jpg"));
        assertThrows(IllegalArgumentException.class, () -> storage.resolve("memories/../../x.jpg"));
        assertThrows(IllegalArgumentException.class, () -> storage.resolve("/etc/passwd"));
        assertThrows(IllegalArgumentException.class,
                () -> storage.put("../outside.jpg", new byte[]{1}, "image/jpeg"));
        assertThrows(IllegalArgumentException.class, () -> storage.delete("../outside.jpg"));
        assertFalse(Files.exists(root.getParent().resolve("outside.jpg")));
    }

    @Test
    void presentationUrlIsRootRelativeSignedAndExpiresAfterTheTtl() {
        SignedPhotoUrl signed = storage("secret", NOW).presentationUrl(key, "image/jpeg", Duration.ofMinutes(15));

        Matcher matcher = URL.matcher(signed.url());
        assertTrue(matcher.matches(), signed.url());
        assertEquals(memoryId.toString(), matcher.group(1));
        assertEquals(photoId + ".jpg", matcher.group(2));
        assertEquals(NOW.plus(Duration.ofMinutes(15)), signed.expiresAt());
        assertEquals(String.valueOf(signed.expiresAt().getEpochSecond()), matcher.group(3));
    }

    @Test
    void publicBaseUrlPrefixesTheUrl() {
        LocalMemoryPhotoStorage storage = new LocalMemoryPhotoStorage(
                root, "secret", "http://localhost:8085/", Clock.fixed(NOW, ZoneOffset.UTC));

        assertTrue(storage.presentationUrl(key, "image/jpeg", Duration.ofMinutes(15)).url()
                .startsWith("http://localhost:8085/api/memories/local-photos/"));
    }

    @Test
    void readSignedServesOnlyAnUnexpiredValidSignatureForAnExistingFile() {
        LocalMemoryPhotoStorage storage = storage("secret", NOW);
        storage.put(key, new byte[]{9, 8, 7}, "image/jpeg");
        Matcher url = parse(storage.presentationUrl(key, "image/jpeg", Duration.ofMinutes(15)));

        Optional<StoredLocalPhoto> photo = storage.readSigned(url.group(1), url.group(2), url.group(3), url.group(4));
        assertTrue(photo.isPresent());
        assertArrayEquals(new byte[]{9, 8, 7}, photo.get().content());
        assertEquals("image/jpeg", photo.get().mediaType());
        assertEquals(900, photo.get().maxAgeSeconds());

        // Tampered signature, changed expiry, other key, malformed parts.
        String sig = url.group(4);
        String tampered = (sig.charAt(0) == 'A' ? "B" : "A") + sig.substring(1);
        assertTrue(storage.readSigned(url.group(1), url.group(2), url.group(3), tampered).isEmpty());
        assertTrue(storage.readSigned(url.group(1), url.group(2),
                String.valueOf(Long.parseLong(url.group(3)) + 1), sig).isEmpty());
        assertTrue(storage.readSigned(url.group(1), UUID.randomUUID() + ".jpg", url.group(3), sig).isEmpty());
        assertTrue(storage.readSigned(UUID.randomUUID().toString(), url.group(2), url.group(3), sig).isEmpty());
        assertTrue(storage.readSigned(url.group(1), photoId + ".png", url.group(3), sig).isEmpty());
        assertTrue(storage.readSigned(url.group(1), "../../x.jpg", url.group(3), sig).isEmpty());
        assertTrue(storage.readSigned("not-a-uuid", url.group(2), url.group(3), sig).isEmpty());
        assertTrue(storage.readSigned(url.group(1), url.group(2), "soon", sig).isEmpty());
        assertTrue(storage.readSigned(url.group(1), url.group(2), url.group(3), "!!").isEmpty());
        assertTrue(storage.readSigned(url.group(1), url.group(2), url.group(3), null).isEmpty());

        // Expired: the same URL read 15 minutes and one second later.
        LocalMemoryPhotoStorage later = storage("secret", NOW.plus(Duration.ofSeconds(901)));
        assertTrue(later.readSigned(url.group(1), url.group(2), url.group(3), sig).isEmpty());

        // Another secret does not accept it.
        assertTrue(storage("other-secret", NOW)
                .readSigned(url.group(1), url.group(2), url.group(3), sig).isEmpty());

        // A valid signature for a key whose file is gone.
        storage.delete(key);
        assertTrue(storage.readSigned(url.group(1), url.group(2), url.group(3), sig).isEmpty());
    }

    @Test
    void aBlankSecretGeneratesARandomOnePerInstance() {
        LocalMemoryPhotoStorage first = storage("  ", NOW);
        LocalMemoryPhotoStorage second = storage("", NOW);
        first.put(key, new byte[]{1}, "image/jpeg");
        Matcher url = parse(first.presentationUrl(key, "image/jpeg", Duration.ofMinutes(15)));

        assertTrue(first.readSigned(url.group(1), url.group(2), url.group(3), url.group(4)).isPresent());
        assertTrue(second.readSigned(url.group(1), url.group(2), url.group(3), url.group(4)).isEmpty());
    }

    private static Matcher parse(SignedPhotoUrl signed) {
        Matcher matcher = URL.matcher(signed.url());
        assertTrue(matcher.matches(), signed.url());
        return matcher;
    }
}
