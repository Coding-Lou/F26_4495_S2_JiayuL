package com.jay.outdoor.memory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import org.springframework.data.domain.Persistable;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * One stored, sanitized photo of a Memory. The id is chosen before the object is
 * written (it is part of the object key), so the entity reports itself as new
 * until it has been persisted.
 */
@Entity
@Table(name = "memory_photos")
public class MemoryPhoto implements Persistable<UUID> {

    @Id
    private UUID id;

    @Column(name = "memory_id", nullable = false, updatable = false)
    private UUID memoryId;

    @Column(name = "object_key", nullable = false, updatable = false)
    private String objectKey;

    @Column(name = "media_type", nullable = false, length = 20, updatable = false)
    private String mediaType;

    @Column(nullable = false)
    private int position;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Transient
    private boolean newEntity = true;

    protected MemoryPhoto() {
    }

    public MemoryPhoto(
            UUID id,
            UUID memoryId,
            String objectKey,
            String mediaType,
            int position
    ) {
        this.id = id;
        this.memoryId = memoryId;
        this.objectKey = objectKey;
        this.mediaType = mediaType;
        this.position = position;
        this.createdAt = OffsetDateTime.now().truncatedTo(ChronoUnit.MICROS);
    }

    @PostLoad
    @PostPersist
    void markPersisted() {
        newEntity = false;
    }

    @Override
    public UUID getId() {
        return id;
    }

    @Override
    public boolean isNew() {
        return newEntity;
    }

    public UUID getMemoryId() {
        return memoryId;
    }

    public String getObjectKey() {
        return objectKey;
    }

    public String getMediaType() {
        return mediaType;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
