package com.jay.outdoor.memory.storage;

/** Bytes served by the local content endpoint for a valid signed URL. */
public record StoredLocalPhoto(byte[] content, String mediaType, long maxAgeSeconds) {
}
