package com.jay.outdoor.memory.storage;

import java.time.Duration;

/** Private storage for sanitized Memory photos. Photo-only; three operations. */
public interface MemoryPhotoStorage {

    /** @throws com.jay.outdoor.memory.exception.StorageUnavailableException on failure */
    void put(String objectKey, byte[] content, String mediaType);

    /** Idempotent. @throws com.jay.outdoor.memory.exception.StorageUnavailableException on failure */
    void delete(String objectKey);

    /** A short-lived URL for reading the object; a local computation, no network call. */
    SignedPhotoUrl presentationUrl(String objectKey, String mediaType, Duration ttl);
}
