package com.jay.outdoor.memory.storage;

import com.jay.outdoor.memory.exception.StorageUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Development-only storage: files under a root directory, read through
 * HMAC-SHA256 signed, expiring, root-relative URLs served by memory-service.
 * Production configuration uses {@link S3MemoryPhotoStorage}.
 */
public class LocalMemoryPhotoStorage implements MemoryPhotoStorage {

    public static final String URL_PATH = "/api/memories/local-photos/";

    private static final Logger log = LoggerFactory.getLogger(LocalMemoryPhotoStorage.class);
    private static final String HMAC = "HmacSHA256";
    private static final Pattern FILE_NAME =
            Pattern.compile("^([0-9a-fA-F-]{36})\\.(jpg|png)$");

    private final Path root;
    private final byte[] signingKey;
    private final String publicBaseUrl;
    private final Clock clock;

    public LocalMemoryPhotoStorage(
            Path root,
            String signingSecret,
            String publicBaseUrl,
            Clock clock
    ) {
        this.root = root.toAbsolutePath().normalize();
        this.publicBaseUrl = stripTrailingSlash(publicBaseUrl == null ? "" : publicBaseUrl.trim());
        this.clock = clock;

        if (signingSecret == null || signingSecret.isBlank()) {
            byte[] generated = new byte[32];
            new SecureRandom().nextBytes(generated);
            this.signingKey = generated;
            log.info("Local photo storage uses a random signing secret; "
                    + "photo URLs stop working after a restart");
        } else {
            this.signingKey = signingSecret.getBytes(StandardCharsets.UTF_8);
        }

        log.info("Local photo storage (development only) enabled");
    }

    @Override
    public void put(String objectKey, byte[] content, String mediaType) {
        Path target = resolve(objectKey);
        Path temporary = null;

        try {
            Files.createDirectories(target.getParent());
            temporary = Files.createTempFile(target.getParent(), ".upload-", ".tmp");
            Files.write(temporary, content);
            Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE);
            temporary = null;
        } catch (IOException | RuntimeException ex) {
            log.warn("Local storage write failed for object {}: {}",
                    objectKey, ex.getClass().getSimpleName());
            throw new StorageUnavailableException();
        } finally {
            if (temporary != null) {
                try {
                    Files.deleteIfExists(temporary);
                } catch (IOException ignored) {
                    // A leftover temporary file is harmless and never served.
                }
            }
        }
    }

    @Override
    public void delete(String objectKey) {
        Path target = resolve(objectKey);

        try {
            Files.deleteIfExists(target);
        } catch (IOException | RuntimeException ex) {
            log.warn("Local storage delete failed for object {}: {}",
                    objectKey, ex.getClass().getSimpleName());
            throw new StorageUnavailableException();
        }
    }

    @Override
    public SignedPhotoUrl presentationUrl(String objectKey, String mediaType, Duration ttl) {
        resolve(objectKey);

        long expires = clock.instant().plus(ttl).getEpochSecond();
        String signature = sign(objectKey, expires);

        String url = publicBaseUrl
                + URL_PATH
                + objectKey.substring(PhotoObjectKeys.PREFIX.length())
                + "?expires=" + expires
                + "&signature=" + signature;

        return new SignedPhotoUrl(url, Instant.ofEpochSecond(expires));
    }

    /**
     * Returns the photo only for an unexpired, valid signature over its key, and
     * an existing file. Every failure is the same empty result.
     */
    public Optional<StoredLocalPhoto> readSigned(
            String memoryIdText,
            String fileName,
            String expiresText,
            String signatureText
    ) {
        if (memoryIdText == null || fileName == null
                || expiresText == null || signatureText == null) {
            return Optional.empty();
        }

        Matcher matcher = FILE_NAME.matcher(fileName);
        if (!matcher.matches()) {
            return Optional.empty();
        }

        String objectKey;
        long expires;
        byte[] presented;

        try {
            UUID memoryId = UUID.fromString(memoryIdText);
            UUID photoId = UUID.fromString(matcher.group(1));
            objectKey = PhotoObjectKeys.photoKey(memoryId, photoId, matcher.group(2));
            expires = Long.parseLong(expiresText);
            presented = Base64.getUrlDecoder().decode(signatureText);
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }

        long now = clock.instant().getEpochSecond();
        if (now > expires) {
            return Optional.empty();
        }

        byte[] expected = Base64.getUrlDecoder().decode(sign(objectKey, expires));
        if (!MessageDigest.isEqual(expected, presented)) {
            return Optional.empty();
        }

        try {
            Path file = resolve(objectKey);
            if (!Files.isRegularFile(file)) {
                return Optional.empty();
            }

            String mediaType = objectKey.endsWith(".png") ? "image/png" : "image/jpeg";
            return Optional.of(new StoredLocalPhoto(
                    Files.readAllBytes(file),
                    mediaType,
                    Math.max(0, expires - now)
            ));
        } catch (IOException | RuntimeException ex) {
            return Optional.empty();
        }
    }

    Path root() {
        return root;
    }

    /** Defence in depth: keys are server-built, but nothing outside the root is touched. */
    Path resolve(String objectKey) {
        Path resolved = root.resolve(objectKey).normalize();

        if (!resolved.startsWith(root) || resolved.equals(root)) {
            throw new IllegalArgumentException("Object key resolves outside the storage root");
        }

        return resolved;
    }

    private String sign(String objectKey, long expires) {
        try {
            Mac mac = Mac.getInstance(HMAC);
            mac.init(new SecretKeySpec(signingKey, HMAC));
            byte[] digest = mac.doFinal(
                    (objectKey + "\n" + expires).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("HmacSHA256 is unavailable", ex);
        }
    }

    private static String stripTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
