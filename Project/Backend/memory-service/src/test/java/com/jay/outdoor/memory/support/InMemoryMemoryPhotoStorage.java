package com.jay.outdoor.memory.support;

import com.jay.outdoor.memory.exception.StorageUnavailableException;
import com.jay.outdoor.memory.storage.MemoryPhotoStorage;
import com.jay.outdoor.memory.storage.SignedPhotoUrl;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/** Test-only storage: records puts and deletes and can be told to fail. */
public class InMemoryMemoryPhotoStorage implements MemoryPhotoStorage {

    public record StoredObject(byte[] content, String mediaType) {
    }

    private final Map<String, StoredObject> objects = new ConcurrentHashMap<>();
    private final List<String> puts = new CopyOnWriteArrayList<>();
    private final List<String> deletes = new CopyOnWriteArrayList<>();

    private volatile boolean failPuts;
    private volatile boolean failDeletes;
    private volatile Consumer<String> afterPut = key -> { };

    @Override
    public void put(String objectKey, byte[] content, String mediaType) {
        puts.add(objectKey);
        if (failPuts) {
            throw new StorageUnavailableException();
        }
        objects.put(objectKey, new StoredObject(content.clone(), mediaType));
        afterPut.accept(objectKey);
    }

    @Override
    public void delete(String objectKey) {
        deletes.add(objectKey);
        if (failDeletes) {
            throw new StorageUnavailableException();
        }
        objects.remove(objectKey);
    }

    @Override
    public SignedPhotoUrl presentationUrl(String objectKey, String mediaType, Duration ttl) {
        Instant expiresAt = Instant.now().plus(ttl);
        return new SignedPhotoUrl(
                "https://photos.example.test/signed/" + UUID.randomUUID()
                        + "?expires=" + expiresAt.getEpochSecond(),
                expiresAt
        );
    }

    public void reset() {
        objects.clear();
        puts.clear();
        deletes.clear();
        failPuts = false;
        failDeletes = false;
        afterPut = key -> { };
    }

    public Map<String, StoredObject> objects() {
        return objects;
    }

    public List<String> puts() {
        return puts;
    }

    public List<String> deletes() {
        return deletes;
    }

    public void failPuts(boolean fail) {
        this.failPuts = fail;
    }

    public void failDeletes(boolean fail) {
        this.failDeletes = fail;
    }

    public void afterPut(Consumer<String> hook) {
        this.afterPut = hook;
    }
}
