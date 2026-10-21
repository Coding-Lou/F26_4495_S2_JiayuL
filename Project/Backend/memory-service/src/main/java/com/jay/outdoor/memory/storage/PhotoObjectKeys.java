package com.jay.outdoor.memory.storage;

import java.util.UUID;

/**
 * {@code memories/{memoryId}/{photoId}.{jpg|png}}: server-generated ids only; no
 * filename, owner, title, or date. Keys are never returned to or taken from clients.
 */
public final class PhotoObjectKeys {

    public static final String PREFIX = "memories/";

    private PhotoObjectKeys() {
    }

    public static String photoKey(UUID memoryId, UUID photoId, String extension) {
        return PREFIX + memoryId + "/" + photoId + "." + extension;
    }
}
