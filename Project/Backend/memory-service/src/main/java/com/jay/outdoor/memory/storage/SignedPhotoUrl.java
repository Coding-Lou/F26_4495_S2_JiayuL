package com.jay.outdoor.memory.storage;

import java.time.Instant;

public record SignedPhotoUrl(String url, Instant expiresAt) {
}
